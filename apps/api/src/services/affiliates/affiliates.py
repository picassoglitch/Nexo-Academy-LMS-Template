from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import os
import secrets
import string

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from src.db.organizations import Organization
from src.db.users import PublicUser, AnonymousUser, InternalUser
from src.services.orgs.orgs import rbac_check
from src.db.affiliates.affiliates import (
    Affiliate,
    AffiliateAttribution,
    AffiliateAttributionModelEnum,
    AffiliateClick,
    AffiliateCode,
    AffiliateCommission,
    AffiliateCommissionStatusEnum,
    AffiliateProgram,
    AffiliateProgramUpdate,
    AffiliateStatsRead,
    AffiliateStatusEnum,
)
from src.db.payments.payments_products import PaymentsProduct, PaymentProductTypeEnum
from src.db.payments.payments_users import PaymentsUser


def _now() -> datetime:
    return datetime.utcnow()


def _hash_ip(ip: str) -> str:
    if not ip:
        return ""
    salt = os.getenv("NEXO_AFFILIATE_IP_SALT", "nexo_affiliate_salt")
    return hashlib.sha256(f"{salt}:{ip}".encode("utf-8")).hexdigest()


def _generate_code(length: int = 10) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_or_create_affiliate_program(org_id: int, db_session: Session) -> AffiliateProgram:
    stmt = select(AffiliateProgram).where(AffiliateProgram.org_id == org_id)
    program = db_session.exec(stmt).first()
    if program:
        return program
    program = AffiliateProgram(org_id=org_id)
    db_session.add(program)
    db_session.commit()
    db_session.refresh(program)
    return program


async def update_affiliate_program(
    request: Request,
    org_id: int,
    body: AffiliateProgramUpdate,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> AffiliateProgram:
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    program = get_or_create_affiliate_program(org_id, db_session)
    for k, v in body.model_dump().items():
        setattr(program, k, v)
    program.update_date = _now()
    db_session.add(program)
    db_session.commit()
    db_session.refresh(program)
    return program


async def create_affiliate(
    request: Request,
    org_id: int,
    name: str,
    email: str,
    user_id: int | None,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> Affiliate:
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)

    affiliate = Affiliate(org_id=org_id, name=name.strip(), email=email.strip().lower(), user_id=user_id)
    db_session.add(affiliate)
    db_session.commit()
    db_session.refresh(affiliate)
    return affiliate


async def generate_affiliate_code(
    request: Request,
    org_id: int,
    affiliate_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> AffiliateCode:
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)

    affiliate = db_session.exec(
        select(Affiliate).where(Affiliate.id == affiliate_id, Affiliate.org_id == org_id)
    ).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    # Generate unique code
    for _ in range(25):
        code = _generate_code()
        exists = db_session.exec(select(AffiliateCode).where(AffiliateCode.code == code)).first()
        if not exists:
            ac = AffiliateCode(org_id=org_id, affiliate_id=affiliate_id, code=code)
            db_session.add(ac)
            db_session.commit()
            db_session.refresh(ac)
            return ac

    raise HTTPException(status_code=500, detail="Failed to generate unique affiliate code")


async def track_affiliate_click(
    request: Request,
    org_id: int,
    code: str,
    landing_url: str,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> dict:
    # Public endpoint; do NOT require auth, but require org exists
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    code_obj = db_session.exec(
        select(AffiliateCode).where(AffiliateCode.code == code, AffiliateCode.org_id == org_id)
    ).first()
    if not code_obj or code_obj.status != AffiliateStatusEnum.ACTIVE:
        raise HTTPException(status_code=404, detail="Affiliate code not found")

    ip = getattr(getattr(request, "client", None), "host", "") or ""
    ua = request.headers.get("user-agent", "") or ""
    click = AffiliateClick(
        org_id=org_id,
        affiliate_code_id=code_obj.id or 0,
        landing_url=landing_url[:500],
        user_agent=ua[:500],
        ip_hash=_hash_ip(ip),
    )
    db_session.add(click)
    db_session.commit()
    db_session.refresh(click)
    return {"ok": True, "click_id": click.id}


def _get_active_attribution_for_user(
    org_id: int,
    user_id: int,
    db_session: Session,
) -> AffiliateAttribution | None:
    stmt = select(AffiliateAttribution).where(
        AffiliateAttribution.org_id == org_id,
        AffiliateAttribution.user_id == user_id,
    )
    attr = db_session.exec(stmt).first()
    if not attr:
        return None
    if attr.locked:
        return attr
    if attr.expires_at and attr.expires_at < _now():
        return None
    return attr


def apply_affiliate_code_to_user(
    org_id: int,
    user_id: int,
    affiliate_code: str,
    db_session: Session,
) -> AffiliateAttribution | None:
    if not affiliate_code:
        return None

    program = get_or_create_affiliate_program(org_id, db_session)
    if not program.enabled:
        return None

    code_obj = db_session.exec(
        select(AffiliateCode).where(AffiliateCode.code == affiliate_code, AffiliateCode.org_id == org_id)
    ).first()
    if not code_obj:
        return None

    affiliate = db_session.exec(
        select(Affiliate).where(Affiliate.id == code_obj.affiliate_id, Affiliate.org_id == org_id)
    ).first()
    if not affiliate or affiliate.status != AffiliateStatusEnum.ACTIVE:
        return None

    existing = db_session.exec(
        select(AffiliateAttribution).where(AffiliateAttribution.org_id == org_id, AffiliateAttribution.user_id == user_id)
    ).first()

    now = _now()
    expires_at = now + timedelta(days=max(1, int(program.attribution_window_days)))

    if existing:
        # First-click: do nothing if already attributed
        if program.attribution_model == AffiliateAttributionModelEnum.FIRST_CLICK:
            return existing
        # Last-click: overwrite unless locked
        if existing.locked:
            return existing
        existing.affiliate_id = affiliate.id or existing.affiliate_id
        existing.affiliate_code_id = code_obj.id or existing.affiliate_code_id
        existing.attributed_at = now
        existing.expires_at = expires_at
        db_session.add(existing)
        db_session.commit()
        db_session.refresh(existing)
        return existing

    attr = AffiliateAttribution(
        org_id=org_id,
        user_id=user_id,
        affiliate_id=affiliate.id or 0,
        affiliate_code_id=code_obj.id,
        attributed_at=now,
        expires_at=expires_at,
        locked=False,
    )
    db_session.add(attr)
    db_session.commit()
    db_session.refresh(attr)
    return attr


def _count_existing_cycles(
    org_id: int,
    affiliate_id: int,
    provider_subscription_id: str,
    db_session: Session,
) -> int:
    stmt = select(AffiliateCommission).where(
        AffiliateCommission.org_id == org_id,
        AffiliateCommission.affiliate_id == affiliate_id,
        AffiliateCommission.provider_subscription_id == provider_subscription_id,
        AffiliateCommission.status != AffiliateCommissionStatusEnum.REVERSED,  # type: ignore
    )
    return len(list(db_session.exec(stmt).all()))


def record_commission_for_payment(
    *,
    org_id: int,
    payment_user_id: int,
    provider_event_id: str,
    provider_subscription_id: str | None,
    db_session: Session,
) -> AffiliateCommission | None:
    # Find payment user
    pu = db_session.exec(
        select(PaymentsUser).where(PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id)
    ).first()
    if not pu:
        return None

    # Attribution must exist: either active window or locked (for recurring)
    attr = _get_active_attribution_for_user(org_id, pu.user_id, db_session)
    if not attr:
        return None

    program = get_or_create_affiliate_program(org_id, db_session)
    if not program.enabled:
        return None

    product = db_session.exec(
        select(PaymentsProduct).where(PaymentsProduct.id == pu.payment_product_id, PaymentsProduct.org_id == org_id)
    ).first()
    if not product:
        return None

    # Idempotency: don't create duplicate commission for same event id
    existing = db_session.exec(
        select(AffiliateCommission).where(
            AffiliateCommission.org_id == org_id,
            AffiliateCommission.payment_user_id == payment_user_id,
            AffiliateCommission.provider_event_id == provider_event_id,
        )
    ).first()
    if existing:
        return existing

    rate = program.one_time_rate
    cycle_number = 1
    if product.product_type == PaymentProductTypeEnum.SUBSCRIPTION and provider_subscription_id:
        prev_cycles = _count_existing_cycles(org_id, attr.affiliate_id, provider_subscription_id, db_session)
        cycle_number = prev_cycles + 1
        rate = program.subscription_first_rate if cycle_number <= int(program.subscription_first_cycles) else program.subscription_recurring_rate
    elif product.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        # Subscription commission requires subscription id for cycle tracking.
        provider_subscription_id = provider_subscription_id or None

    amount_cents = int(round(float(product.amount) * 100 * float(rate)))

    commission = AffiliateCommission(
        org_id=org_id,
        affiliate_id=attr.affiliate_id,
        user_id=pu.user_id,
        payment_user_id=payment_user_id,
        product_id=product.id,
        currency=product.currency,
        amount_cents=amount_cents,
        rate_applied=float(rate),
        cycle_number=cycle_number,
        provider_event_id=provider_event_id,
        provider_subscription_id=provider_subscription_id,
    )

    # Lock attribution once the first paid commission is recorded (so recurring payouts keep flowing).
    if not attr.locked:
        attr.locked = True
        attr.locked_at = _now()
        attr.provider_subscription_id = provider_subscription_id or attr.provider_subscription_id
        db_session.add(attr)

    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)
    return commission


def get_affiliate_admin_stats(org_id: int, db_session: Session) -> list[AffiliateStatsRead]:
    # naive aggregates (good enough for MVP; can be optimized later)
    affiliates = list(db_session.exec(select(Affiliate).where(Affiliate.org_id == org_id)).all())
    out: list[AffiliateStatsRead] = []
    for a in affiliates:
        code_ids = [c.id for c in db_session.exec(select(AffiliateCode).where(AffiliateCode.affiliate_id == a.id)).all()]
        clicks = 0
        if code_ids:
            clicks = len(list(db_session.exec(select(AffiliateClick).where(AffiliateClick.affiliate_code_id.in_(code_ids))).all()))  # type: ignore

        signups = len(list(db_session.exec(select(AffiliateAttribution).where(AffiliateAttribution.affiliate_id == a.id)).all()))
        pending = list(
            db_session.exec(
                select(AffiliateCommission).where(
                    AffiliateCommission.affiliate_id == a.id,
                    AffiliateCommission.status == AffiliateCommissionStatusEnum.PENDING,  # type: ignore
                )
            ).all()
        )
        paid = list(
            db_session.exec(
                select(AffiliateCommission).where(
                    AffiliateCommission.affiliate_id == a.id,
                    AffiliateCommission.status == AffiliateCommissionStatusEnum.PAID,  # type: ignore
                )
            ).all()
        )
        pending_amount = sum(int(x.amount_cents or 0) for x in pending)
        paid_amount = sum(int(x.amount_cents or 0) for x in paid)
        currency = pending[0].currency if pending else (paid[0].currency if paid else "USD")
        out.append(
            AffiliateStatsRead(
                affiliate_id=a.id or 0,
                clicks=clicks,
                signups=signups,
                pending_amount_cents=pending_amount,
                paid_amount_cents=paid_amount,
                currency=currency,
            )
        )
    return out

