import logging
from typing import Literal
from fastapi import HTTPException, Request
from sqlmodel import Session
import stripe
from config.config import  get_nexo_config
from src.db.payments.payments import PaymentsConfigUpdate, PaymentsConfig
from src.db.payments.payments_users import PaymentsUser
from src.db.payments.payments_products import (
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.services.payments.payments_config import (
    get_payments_config,
    update_payments_config,
)
from sqlmodel import select
from datetime import datetime
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
import re

from src.services.payments.payments_users import (
    create_payment_user,
    delete_payment_user,
)


async def get_stripe_connected_account_id(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
):
    # Get payments config
    payments_config = await get_payments_config(request, org_id, current_user, db_session)

    return payments_config[0].provider_specific_id


async def get_stripe_internal_credentials(
):
    # Get payments config from config file
    nexo_config = get_nexo_config()

    if not nexo_config.payments_config.stripe.stripe_secret_key:
        raise HTTPException(status_code=400, detail="Stripe secret key not configured")

    if not nexo_config.payments_config.stripe.stripe_publishable_key:
        raise HTTPException(
            status_code=400, detail="Stripe publishable key not configured"
        )

    return {
        "stripe_secret_key": nexo_config.payments_config.stripe.stripe_secret_key,
        "stripe_publishable_key": nexo_config.payments_config.stripe.stripe_publishable_key,
        "stripe_webhook_standard_secret": nexo_config.payments_config.stripe.stripe_webhook_standard_secret,
        "stripe_webhook_connect_secret": nexo_config.payments_config.stripe.stripe_webhook_connect_secret,
    }


async def create_stripe_product(
    request: Request,
    org_id: int,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    creds = await get_stripe_internal_credentials()

    # Set the Stripe API key using the credentials
    stripe.api_key = creds.get("stripe_secret_key")

    # Prepare default_price_data based on price_type
    if product_data.price_type == PaymentPriceTypeEnum.CUSTOMER_CHOICE:
        default_price_data = {
            "currency": product_data.currency,
            "custom_unit_amount": {
                "enabled": True,
                "minimum": int(product_data.amount * 100),  # Convert to cents
            },
        }
    else:
        default_price_data = {
            "currency": product_data.currency,
            "unit_amount": int(product_data.amount * 100),  # Convert to cents
        }

    if product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        default_price_data["recurring"] = {"interval": "month"}

    stripe_acc_id = await get_stripe_connected_account_id(request, org_id, current_user, db_session)

    def _stripe_marketing_features(benefits: str | None):
        """
        Stripe Product marketing_features[].name has a hard 80 character limit.
        Users often enter benefits as multiline text; we support newline or comma separated values.
        """
        if not benefits:
            return []

        # Split on commas OR newlines, trim whitespace, drop empties.
        parts = [p.strip() for p in re.split(r"[,\n\r]+", benefits) if p.strip()]

        # Stripe allows only short strings here; truncate defensively to avoid 400s.
        out = []
        for p in parts:
            out.append({"name": p[:80]})
        return out

    try:
        product = stripe.Product.create(
            name=product_data.name,
            description=product_data.description or "",
            marketing_features=_stripe_marketing_features(getattr(product_data, "benefits", None)),
            default_price_data=default_price_data,  # type: ignore
            stripe_account=stripe_acc_id,
        )
        return product
    except stripe.StripeError as e:
        # Surface a clean error to the client (otherwise this becomes a 500 and breaks fetch UX)
        msg = str(e)
        logging.error(f"Error creating Stripe product: {msg}")

        # Common misconfiguration: keys don't belong to the Stripe Connect platform that owns the connected account.
        if "does not have access to account" in msg or "Application access may have been revoked" in msg:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Stripe keys / connected account mismatch. Your API Stripe Secret Key does not have access to the "
                    f"connected account '{stripe_acc_id}'. This usually happens when you changed Stripe keys after "
                    "connecting, or the Stripe Client ID/Secret Key are from a different Stripe account.\n\n"
                    "Fix: update the API Stripe keys to the correct Connect platform account, then remove the Stripe "
                    "connection in the UI and connect again."
                ),
            )

        raise HTTPException(status_code=400, detail=f"Stripe error creating product: {msg}")


async def archive_stripe_product(
    request: Request,
    org_id: int,
    product_id: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    creds = await get_stripe_internal_credentials()

    # Set the Stripe API key using the credentials
    stripe.api_key = creds.get("stripe_secret_key")

    stripe_acc_id = await get_stripe_connected_account_id(request, org_id, current_user, db_session)

    try:
        # Archive the product in Stripe
        archived_product = stripe.Product.modify(product_id, active=False, stripe_account=stripe_acc_id)

        return archived_product
    except stripe.StripeError as e:
        print(f"Error archiving Stripe product: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Error archiving Stripe product: {str(e)}"
        )


async def update_stripe_product(
    request: Request,
    org_id: int,
    product_id: str,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    creds = await get_stripe_internal_credentials()

    # Set the Stripe API key using the credentials
    stripe.api_key = creds.get("stripe_secret_key")

    stripe_acc_id = await get_stripe_connected_account_id(request, org_id, current_user, db_session)

    try:
        # Create new price based on price_type
        if product_data.price_type == PaymentPriceTypeEnum.CUSTOMER_CHOICE:
            new_price_data = {
                "currency": product_data.currency,
                "product": product_id,
                "custom_unit_amount": {
                    "enabled": True,
                    "minimum": int(product_data.amount * 100),  # Convert to cents
                },
            }
        else:
            new_price_data = {
                "currency": product_data.currency,
                "unit_amount": int(product_data.amount * 100),  # Convert to cents
                "product": product_id,
            }

        if product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
            new_price_data["recurring"] = {"interval": "month"}

        new_price = stripe.Price.create(**new_price_data)

        # Prepare the update data
        update_data = {
            "name": product_data.name,
            "description": product_data.description or "",
            "metadata": {"benefits": product_data.benefits},
            "marketing_features": [
                {"name": benefit.strip()}
                for benefit in product_data.benefits.split(",")
                if benefit.strip()
            ],
            "default_price": new_price.id,
        }

        # Update the product in Stripe
        updated_product = stripe.Product.modify(product_id, **update_data, stripe_account=stripe_acc_id)

        # Archive all existing prices for the product
        existing_prices = stripe.Price.list(product=product_id, active=True)
        for price in existing_prices:
            if price.id != new_price.id:
                stripe.Price.modify(price.id, active=False, stripe_account=stripe_acc_id)

        return updated_product
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400, detail=f"Error updating Stripe product: {str(e)}"
        )


async def create_checkout_session(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    logger = logging.getLogger("uvicorn.error")
    # Get Stripe credentials
    creds = await get_stripe_internal_credentials()
    stripe.api_key = creds.get("stripe_secret_key")


    stripe_acc_id = await get_stripe_connected_account_id(request, org_id, current_user, db_session)

    # Get product details
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Stripe can inject the checkout session id into the success URL.
    # This lets us verify the payment after redirect in local dev without relying on webhooks.
    #
    # IMPORTANT:
    # Stripe replaces the literal token "{CHECKOUT_SESSION_ID}" in success_url.
    # If we URL-encode curly braces (e.g. "%7B...%7D"), Stripe will NOT replace it.
    #
    # Some URL builders/encoders will escape curly braces automatically, so we avoid
    # encoding here and instead append the param directly.
    def _append_query_param_raw(url: str, raw_param: str) -> str:
        parsed = urlparse(url)
        # Keep any existing query string exactly as-is, just append our param.
        if parsed.query:
            query = f"{parsed.query}&{raw_param}"
        else:
            query = raw_param
        return urlunparse(parsed._replace(query=query))

    def _add_query_params(url: str, extra: dict[str, str]) -> str:
        parsed = urlparse(url)
        q = dict(parse_qsl(parsed.query, keep_blank_values=True))
        q.update(extra)
        return urlunparse(parsed._replace(query=urlencode(q)))

    # Get the default price for the product
    stripe_product = stripe.Product.retrieve(product.provider_product_id, stripe_account=stripe_acc_id)
    line_items = [{"price": stripe_product.default_price, "quantity": 1}]


    # Create or retrieve Stripe customer
    payment_user = None
    try:
        customers = stripe.Customer.list(
            email=current_user.email, stripe_account=stripe_acc_id
        )
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={
                    "user_id": str(current_user.id),
                    "org_id": str(org_id),
                },
                stripe_account=stripe_acc_id,
            )

        # Create initial payment user with pending status
        payment_user = await create_payment_user(
            request=request,
            org_id=org_id,
            user_id=current_user.id,
            product_id=product_id,
            status=PaymentStatusEnum.PENDING,
            provider_data=customer,
            current_user=InternalUser(),
            db_session=db_session,
        )

        if not payment_user:
            raise HTTPException(status_code=400, detail="Error creating payment user")

    except stripe.StripeError as e:
        # Clean up payment user if customer creation fails
        if payment_user and payment_user.id:
            await delete_payment_user(
                request, org_id, payment_user.id, InternalUser(), db_session
            )
        raise HTTPException(
            status_code=400, detail=f"Error creating/retrieving customer: {str(e)}"
        )

    # Build Stripe redirect URLs AFTER we have the DB payment_user id.
    # This also provides a stable fallback identifier if Stripe doesn't inject session_id.
    redirect_uri_with_payment_user = _append_query_param_raw(
        redirect_uri, f"payment_user_id={payment_user.id}"
    )
    success_url = _append_query_param_raw(
        redirect_uri_with_payment_user, "session_id={CHECKOUT_SESSION_ID}"
    )
    cancel_url = _append_query_param_raw(redirect_uri_with_payment_user, "canceled=1")

    # Use uvicorn logger to ensure this shows up in dev output.
    logger.info(f"[payments] create_checkout_session org_id={org_id} product_id={product_id}")
    logger.info(f"[payments] redirect_uri(raw)={redirect_uri}")
    logger.info(f"[payments] stripe success_url={success_url}")
    logger.info(f"[payments] stripe cancel_url={cancel_url}")

    # Create checkout session with customer
    try:
        checkout_session_params = {
            "success_url": success_url,
            "cancel_url": cancel_url,
            "mode": (
                "payment"
                if product.product_type == PaymentProductTypeEnum.ONE_TIME
                else "subscription"
            ),
            "line_items": line_items,
            "customer": customer.id,
            "client_reference_id": str(payment_user.id),
            "metadata": {
                "product_id": str(product.id),
                "payment_user_id": str(payment_user.id),
                "org_id": str(org_id),
                "user_id": str(current_user.id),
            }
        }

        # Add payment_intent_data only for one-time payments
        if product.product_type == PaymentProductTypeEnum.ONE_TIME:
            checkout_session_params["payment_intent_data"] = {
                "metadata": {
                    "product_id": str(product.id),
                    "payment_user_id": str(payment_user.id),
                }
            }
        # Add subscription_data for subscription payments
        else:
            checkout_session_params["subscription_data"] = {
                "metadata": {
                    "product_id": str(product.id),
                    "payment_user_id": str(payment_user.id),
                }
            }

        checkout_session = stripe.checkout.Session.create(**checkout_session_params, stripe_account=stripe_acc_id)

        return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}

    except stripe.StripeError as e:
        # Clean up payment user if checkout session creation fails
        if payment_user and payment_user.id:
            await delete_payment_user(
                request, org_id, payment_user.id, InternalUser(), db_session
            )
        logging.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


async def verify_stripe_checkout_session(
    request: Request,
    org_id: int,
    session_id: str | None,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    payment_user_id: int | None = None,
):
    """
    Verify a Stripe Checkout Session and mark the corresponding PaymentsUser as ACTIVE/COMPLETED.
    This is especially important for local development where Stripe webhooks may not be configured.
    """
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(status_code=401, detail="Not authenticated")

    creds = await get_stripe_internal_credentials()
    stripe.api_key = creds.get("stripe_secret_key")

    stripe_acc_id = await get_stripe_connected_account_id(request, org_id, current_user, db_session)

    def _looks_like_unreplaced_token(value: str | None) -> bool:
        if not value:
            return True
        v = str(value)
        return v == "{CHECKOUT_SESSION_ID}" or "CHECKOUT_SESSION_ID" in v or (v.startswith("{") and v.endswith("}"))

    try:
        if session_id and not _looks_like_unreplaced_token(session_id):
            checkout = stripe.checkout.Session.retrieve(
                session_id,
                stripe_account=stripe_acc_id,
                expand=["subscription", "payment_intent"],
            )
        else:
            # Fallback: recover the Checkout Session using the stored Stripe customer + payment_user_id.
            if not payment_user_id:
                raise HTTPException(status_code=400, detail="Missing checkout session id.")

            statement = select(PaymentsUser).where(
                PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id
            )
            payment_user = db_session.exec(statement).first()
            if not payment_user:
                raise HTTPException(status_code=404, detail="Payment user not found")

            # Prevent a user from claiming someone else's checkout
            if int(payment_user.user_id) != int(current_user.id):
                raise HTTPException(status_code=403, detail="Not allowed")

            provider_data = payment_user.provider_specific_data or {}
            stripe_customer = provider_data.get("stripe_customer") or {}
            stripe_customer_id = stripe_customer.get("id")
            if not stripe_customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="Missing Stripe customer id for this payment (cannot recover session).",
                )

            sessions = stripe.checkout.Session.list(
                customer=stripe_customer_id,
                status="complete",
                limit=20,
                stripe_account=stripe_acc_id,
            )

            sessions_data = getattr(sessions, "data", None)
            if sessions_data is None and hasattr(sessions, "get"):
                try:
                    sessions_data = sessions.get("data")
                except Exception:
                    sessions_data = None

            best = None
            best_created = None
            for s in (sessions_data or []):
                sid = getattr(s, "id", None) or s.get("id")
                created = getattr(s, "created", None) if hasattr(s, "created") else s.get("created")
                client_ref = getattr(s, "client_reference_id", None) if hasattr(s, "client_reference_id") else s.get("client_reference_id")
                metadata = getattr(s, "metadata", None) if hasattr(s, "metadata") else s.get("metadata") or {}
                md_payment_user_id = None
                try:
                    md_payment_user_id = (metadata or {}).get("payment_user_id")
                except Exception:
                    md_payment_user_id = None

                if str(client_ref) != str(payment_user_id) and str(md_payment_user_id) != str(payment_user_id):
                    continue

                if best is None or (created is not None and (best_created is None or int(created) > int(best_created))):
                    best = sid
                    best_created = created

            if not best:
                raise HTTPException(
                    status_code=400,
                    detail="Could not locate a completed Stripe checkout session for this payment.",
                )

            checkout = stripe.checkout.Session.retrieve(
                best,
                stripe_account=stripe_acc_id,
                expand=["subscription", "payment_intent"],
            )

    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Stripe error retrieving checkout session: {str(e)}",
        )

    payment_user_id_raw = None
    try:
        payment_user_id_raw = (checkout.get("metadata") or {}).get("payment_user_id") or checkout.get("client_reference_id")
    except Exception:
        payment_user_id_raw = None

    if not payment_user_id_raw:
        raise HTTPException(status_code=400, detail="Checkout session is missing payment_user_id metadata")

    try:
        payment_user_id = int(payment_user_id_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payment_user_id in checkout session metadata")

    statement = select(PaymentsUser).where(PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id)
    payment_user = db_session.exec(statement).first()
    if not payment_user:
        raise HTTPException(status_code=404, detail="Payment user not found")

    # Prevent a user from claiming someone else's checkout
    if int(payment_user.user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    payment_status = getattr(checkout, "payment_status", None) or checkout.get("payment_status")
    mode = getattr(checkout, "mode", None) or checkout.get("mode")
    status = getattr(checkout, "status", None) or checkout.get("status")

    if payment_status == "paid" or status == "complete":
        new_status = PaymentStatusEnum.ACTIVE if mode == "subscription" else PaymentStatusEnum.COMPLETED
    elif payment_status in ("unpaid", "no_payment_required"):
        new_status = PaymentStatusEnum.PENDING
    else:
        new_status = PaymentStatusEnum.FAILED

    # Persist provider info for debugging / future reconciliation.
    provider_data = payment_user.provider_specific_data or {}
    provider_data.update(
        {
            "stripe_checkout_session_id": checkout.get("id"),
            "stripe_payment_status": payment_status,
            "stripe_mode": mode,
            "stripe_subscription_id": (checkout.get("subscription") or {}).get("id")
            if isinstance(checkout.get("subscription"), dict)
            else checkout.get("subscription"),
            "stripe_payment_intent_id": (checkout.get("payment_intent") or {}).get("id")
            if isinstance(checkout.get("payment_intent"), dict)
            else checkout.get("payment_intent"),
            "verified_at": datetime.utcnow().isoformat(),
        }
    )

    payment_user.status = new_status
    payment_user.provider_specific_data = provider_data
    payment_user.update_date = datetime.now()

    db_session.add(payment_user)
    db_session.commit()
    db_session.refresh(payment_user)

    return {
        "success": True,
        "payment_user_id": payment_user.id,
        "status": payment_user.status,
        "checkout_session_id": checkout.get("id"),
        "payment_status": payment_status,
        "mode": mode,
    }


async def generate_stripe_connect_link(
    request: Request,
    org_id: int,
    redirect_uri: str,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
):
    """
    Generate a Stripe OAuth link for connecting a Stripe account
    """
    # Basic validation first
    if not redirect_uri or not (redirect_uri.startswith("http://") or redirect_uri.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid redirect_uri (must be absolute http(s) URL)")

    # Get credentials
    creds = await get_stripe_internal_credentials()
    stripe.api_key = creds.get("stripe_secret_key")
    
    # Get nexo config for client_id
    nexo_config = get_nexo_config()
    client_id = nexo_config.payments_config.stripe.stripe_client_id
    
    if not client_id:
        raise HTTPException(status_code=400, detail="Stripe client ID not configured")

    state = f"org_id={org_id}"
    
    # Generate OAuth link for existing accounts
    oauth_link = f"https://connect.stripe.com/oauth/authorize?response_type=code&client_id={client_id}&scope=read_write&redirect_uri={redirect_uri}&state={state}"

    return {"connect_url": oauth_link}

async def create_stripe_account(
    request: Request,
    org_id: int,
    type: Literal["standard"], # Only standard is supported for now, we'll see if we need express later
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
):
    # Get credentials
    creds = await get_stripe_internal_credentials()
    stripe.api_key = creds.get("stripe_secret_key")

    # Get existing payments config
    statement = select(PaymentsConfig).where(PaymentsConfig.org_id == org_id)
    existing_config = db_session.exec(statement).first()

    if existing_config and existing_config.provider_specific_id:
        logging.error(f"A Stripe Account is already linked to this organization: {existing_config.provider_specific_id}")
        return existing_config.provider_specific_id

    # Create Stripe account
    stripe_account = stripe.Account.create(
        type="standard",
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
    )

    config_data = existing_config.model_dump() if existing_config else {}
    config_data.update({
            "enabled": True,
            "provider_specific_id": stripe_account.id,  # Use the ID directly
        "provider_config": {"onboarding_completed": False}
    })

    # Update payments config for the org
    await update_payments_config(
        request,
        org_id,
        PaymentsConfigUpdate(**config_data),
        current_user,
        db_session,
    )

    return stripe_account


async def update_stripe_account_id(
    request: Request,
    org_id: int,
    stripe_account_id: str,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
):
    """
    Update the Stripe account ID for an organization
    """
    # Get existing payments config
    statement = select(PaymentsConfig).where(PaymentsConfig.org_id == org_id)
    existing_config = db_session.exec(statement).first()

    if not existing_config:
        raise HTTPException(
            status_code=404,
            detail="No payments configuration found for this organization"
        )

    # Create config update with existing values but new stripe account id
    config_data = existing_config.model_dump()
    config_data["provider_specific_id"] = stripe_account_id
    # Mark connection as active once we have a connected account id
    config_data["active"] = True
    # Ensure provider_config reflects completed onboarding/connection
    provider_config = (config_data.get("provider_config") or {}) if isinstance(config_data.get("provider_config"), dict) else {}
    provider_config["onboarding_completed"] = True
    config_data["provider_config"] = provider_config

    # Update payments config
    await update_payments_config(
        request,
        org_id,
        PaymentsConfigUpdate(**config_data),
        current_user,
        db_session,
    )

    return {"message": "Stripe account ID updated successfully"}

async def handle_stripe_oauth_callback(
    request: Request,
    org_id: int,
    code: str,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
):
    """
    Handle the OAuth callback from Stripe and complete the account connection
    """
    creds = await get_stripe_internal_credentials()
    stripe.api_key = creds.get("stripe_secret_key")

    try:
        # Exchange the authorization code for an access token
        response = stripe.OAuth.token(
            grant_type='authorization_code',
            code=code,
        )
        
        connected_account_id = response.stripe_user_id
        if not connected_account_id:
            raise HTTPException(status_code=400, detail="No account ID received from Stripe")

        # Fail fast if the configured platform key cannot access the connected account.
        # This prevents us from marking the org as "Connected" only to fail later when creating products.
        try:
            stripe.Account.retrieve(connected_account_id)
        except stripe.StripeError as e:
            msg = str(e)
            logging.error(f"Stripe connected account access check failed: {msg}")
            raise HTTPException(
                status_code=400,
                detail=(
                    "Stripe keys / connected account mismatch. The API Stripe Secret Key does not have access to the "
                    f"connected account '{connected_account_id}'. Make sure STRIPE_SECRET_KEY and STRIPE_CLIENT_ID "
                    "come from the same Stripe account (Connect platform), then remove the connection and connect again."
                ),
            )

        # Now connected_account_id is guaranteed to be a string
        await update_stripe_account_id(
            request,
            org_id,
            connected_account_id,
            current_user,
            db_session,
        )

        return {"success": True, "account_id": connected_account_id}

    except stripe.StripeError as e:
        logging.error(f"Error connecting Stripe account: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Error connecting Stripe account: {str(e)}"
        )
