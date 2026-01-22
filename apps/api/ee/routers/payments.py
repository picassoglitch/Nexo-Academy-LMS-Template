from typing import Literal
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.db.payments.payments import PaymentsConfig, PaymentsConfigRead
from src.db.users import AnonymousUser, PublicUser
from src.security.auth import get_current_user
from src.services.payments.payments_config import (
    init_payments_config,
    get_payments_config,
    delete_payments_config,
)
from src.db.payments.payments_products import PaymentsProductCreate, PaymentsProductRead, PaymentsProductUpdate
from src.services.payments.payments_products import create_payments_product, delete_payments_product, get_payments_product, get_products_by_course, list_payments_products, update_payments_product
from src.services.payments.payments_courses import (
    link_course_to_product,
    unlink_course_from_product,
    get_courses_by_product,
)
from src.services.payments.payments_users import get_owned_courses
from src.services.payments.payments_stripe import (
    create_checkout_session,
    handle_stripe_oauth_callback,
    update_stripe_account_id,
    verify_stripe_checkout_session,
)
from src.services.payments.payments_access import check_course_paid_access
from src.services.payments.payments_customers import get_customers
from src.services.payments.payments_stripe import generate_stripe_connect_link
from src.services.payments.webhooks.payments_webhooks import handle_stripe_webhook
from config.config import get_nexo_config
from src.services.orgs.orgs import rbac_check
from src.db.organizations import Organization

from pydantic import BaseModel
from pathlib import Path
import yaml


router = APIRouter()

@router.post("/{org_id}/config")
async def api_create_payments_config(
    request: Request,
    org_id: int,
    provider: Literal["stripe"],
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsConfig:
    return await init_payments_config(request, org_id, provider, current_user, db_session)


@router.get("/{org_id}/config")
async def api_get_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsConfigRead]:
    return await get_payments_config(request, org_id, current_user, db_session)

@router.delete("/{org_id}/config")
async def api_delete_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    await delete_payments_config(request, org_id, current_user, db_session)
    return {"message": "Payments config deleted successfully"}

@router.post("/{org_id}/products")
async def api_create_payments_product(
    request: Request,
    org_id: int,
    payments_product: PaymentsProductCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await create_payments_product(request, org_id, payments_product, current_user, db_session)

@router.get("/{org_id}/products")
async def api_get_payments_products(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsProductRead]:
    return await list_payments_products(request, org_id, current_user, db_session)

@router.get("/{org_id}/products/{product_id}")
async def api_get_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await get_payments_product(request, org_id, product_id, current_user, db_session)

@router.put("/{org_id}/products/{product_id}")
async def api_update_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    payments_product: PaymentsProductUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await update_payments_product(request, org_id, product_id, payments_product, current_user, db_session)

@router.delete("/{org_id}/products/{product_id}")
async def api_delete_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    await delete_payments_product(request, org_id, product_id, current_user, db_session)
    return {"message": "Payments product deleted successfully"}

@router.post("/{org_id}/products/{product_id}/courses/{course_id}")
async def api_link_course_to_product(
    request: Request,
    org_id: int,
    product_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await link_course_to_product(
        request, org_id, course_id, product_id, current_user, db_session
    )

@router.delete("/{org_id}/products/{product_id}/courses/{course_id}")
async def api_unlink_course_from_product(
    request: Request,
    org_id: int,
    product_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await unlink_course_from_product(
        request, org_id, course_id, current_user, db_session
    )

@router.get("/{org_id}/products/{product_id}/courses")
async def api_get_courses_by_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_courses_by_product(
        request, org_id, product_id, current_user, db_session
    )

@router.get("/{org_id}/courses/{course_id}/products")
async def api_get_products_by_course(
    request: Request,
    org_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_products_by_course(
        request, org_id, course_id, current_user, db_session
    )

# Payments webhooks

@router.post("/stripe/webhook")
async def api_handle_connected_accounts_stripe_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    return await handle_stripe_webhook(request, "standard", db_session)

@router.post("/stripe/webhook/connect")
async def api_handle_connected_accounts_stripe_webhook_connect(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    return await handle_stripe_webhook(request, "connect", db_session)

# Payments checkout

@router.post("/{org_id}/stripe/checkout/product/{product_id}")
async def api_create_checkout_session(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await create_checkout_session(request, org_id, product_id, redirect_uri, current_user, db_session)


@router.get("/{org_id}/stripe/checkout/session/verify")
async def api_verify_checkout_session(
    request: Request,
    org_id: int,
    session_id: str | None = None,
    payment_user_id: int | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Verify a Stripe Checkout session after redirect and update DB access.
    This is used by the web app return page in local dev (webhooks optional).
    """
    return await verify_stripe_checkout_session(
        request,
        org_id,
        session_id,
        current_user,
        db_session,
        payment_user_id=payment_user_id,
    )

@router.get("/{org_id}/courses/{course_id}/access")
async def api_check_course_paid_access(
    request: Request,
    org_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Check if current user has paid access to a specific course
    """
    return {
        "has_access": await check_course_paid_access(
            course_id=course_id,
            org_id=org_id,
            user=current_user,
            db_session=db_session
        )
    }

@router.get("/{org_id}/customers")
async def api_get_customers(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get list of customers and their subscriptions for an organization
    """
    return await get_customers(request, org_id, current_user, db_session)

@router.get("/{org_id}/courses/owned")
async def api_get_owned_courses(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_owned_courses(request, current_user, db_session)

@router.put("/{org_id}/stripe/account")
async def api_update_stripe_account_id(
    request: Request,
    org_id: int,
    stripe_account_id: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await update_stripe_account_id(
        request, org_id, stripe_account_id, current_user, db_session
    )

@router.post("/{org_id}/stripe/connect/link")
async def api_generate_stripe_connect_link(
    request: Request,
    org_id: int,
    redirect_uri: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Generate a Stripe OAuth link for connecting a Stripe account
    """
    return await generate_stripe_connect_link(
        request, org_id, redirect_uri, current_user, db_session
    )

@router.get("/stripe/config/status")
async def api_stripe_config_status(
    current_user: PublicUser = Depends(get_current_user),
):
    """
    Return whether Stripe env/config is present on the API server (never returns secrets).
    Useful for confirming env vars were applied after an API restart.
    """
    cfg = get_nexo_config()
    stripe_cfg = cfg.payments_config.stripe
    return {
        "stripe_secret_key_configured": bool(stripe_cfg.stripe_secret_key),
        "stripe_publishable_key_configured": bool(stripe_cfg.stripe_publishable_key),
        "stripe_client_id_configured": bool(stripe_cfg.stripe_client_id),
    }


class StripeDevConfigUpdate(BaseModel):
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_client_id: str


def _write_stripe_keys_to_config_yaml(body: StripeDevConfigUpdate) -> None:
    # Update apps/api/config/config.yaml (the same file used by get_nexo_config())
    config_path = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    raw = config_path.read_text(encoding="utf-8")
    doc = yaml.safe_load(raw) or {}
    doc.setdefault("payments_config", {})
    doc["payments_config"].setdefault("stripe", {})
    doc["payments_config"]["stripe"]["stripe_secret_key"] = body.stripe_secret_key.strip()
    doc["payments_config"]["stripe"]["stripe_publishable_key"] = body.stripe_publishable_key.strip()
    doc["payments_config"]["stripe"]["stripe_client_id"] = body.stripe_client_id.strip()

    config_path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True), encoding="utf-8")


async def _api_stripe_config_dev_set_impl(
    request: Request,
    body: StripeDevConfigUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    DEV-ONLY helper: write Stripe keys into config/config.yaml so local dev can proceed
    without restarting the API / managing shell env vars.

    Safety gates:
    - development_mode must be true
    - request must come from localhost
    - user must be authenticated
    """
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(status_code=401, detail="Not authenticated")

    cfg = get_nexo_config()
    if not cfg.general_config.development_mode:
        raise HTTPException(status_code=403, detail="Not allowed (development_mode is disabled)")

    client_host = getattr(getattr(request, "client", None), "host", None)
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Not allowed (localhost only)")

    _write_stripe_keys_to_config_yaml(body)

    return {"ok": True}


# Back-compat / simplest UX: no org id needed in dev; just save keys.
@router.post("/stripe/config/dev-set")
async def api_stripe_config_dev_set_legacy(
    request: Request,
    body: StripeDevConfigUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await _api_stripe_config_dev_set_impl(request, body, current_user, db_session)


# Optional org-scoped route (kept for future strict RBAC if needed)
@router.post("/{org_id}/stripe/config/dev-set")
async def api_stripe_config_dev_set(
    request: Request,
    org_id: int,
    body: StripeDevConfigUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    # If an org is provided, at least verify it exists and user can "update" it.
    org = db_session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)
    _write_stripe_keys_to_config_yaml(body)
    return {"ok": True}

@router.get("/stripe/oauth/callback")
async def stripe_oauth_callback(
    request: Request,
    code: str,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await handle_stripe_oauth_callback(request, org_id, code, current_user, db_session)