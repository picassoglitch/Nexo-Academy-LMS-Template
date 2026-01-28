from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import PublicUser
from src.db.affiliates.affiliates import (
    AffiliateCreate,
    AffiliateProgramUpdate,
)
from src.services.affiliates.affiliates import (
    apply_affiliate_code_to_user,
    create_affiliate,
    generate_affiliate_code,
    get_affiliate_admin_stats,
    get_or_create_affiliate_program,
    track_affiliate_click,
    update_affiliate_program,
)


router = APIRouter()


class TrackClickBody(BaseModel):
    org_id: int
    code: str
    landing_url: str = ""


@router.get("/{org_id}/program")
async def api_get_affiliate_program(
    org_id: int,
    db_session: Session = Depends(get_db_session),
):
    return get_or_create_affiliate_program(org_id, db_session).model_dump()


@router.put("/{org_id}/program")
async def api_update_affiliate_program(
    request: Request,
    org_id: int,
    body: AffiliateProgramUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    program = await update_affiliate_program(request, org_id, body, current_user, db_session)
    return program.model_dump()


@router.post("/{org_id}/affiliates")
async def api_create_affiliate(
    request: Request,
    org_id: int,
    body: AffiliateCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    affiliate = await create_affiliate(
        request=request,
        org_id=org_id,
        name=body.name,
        email=body.email,
        user_id=body.user_id,
        current_user=current_user,
        db_session=db_session,
    )
    return affiliate.model_dump()


@router.post("/{org_id}/affiliates/{affiliate_id}/codes")
async def api_generate_affiliate_code(
    request: Request,
    org_id: int,
    affiliate_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    code = await generate_affiliate_code(request, org_id, affiliate_id, current_user, db_session)
    return code.model_dump()


@router.get("/{org_id}/stats")
async def api_admin_affiliate_stats(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    # RBAC enforced inside service via org admin check in other endpoints.
    # For stats we keep it simple: just require auth and org program presence.
    return [s.model_dump() for s in get_affiliate_admin_stats(org_id, db_session)]


@router.post("/track")
async def api_track_click(
    request: Request,
    body: TrackClickBody,
    db_session: Session = Depends(get_db_session),
    current_user: PublicUser = Depends(get_current_user),
):
    # This endpoint is safe to call without a real logged-in user, but current stack always sends a user.
    return await track_affiliate_click(request, body.org_id, body.code, body.landing_url, current_user, db_session)


class ApplyCodeBody(BaseModel):
    org_id: int
    user_id: int
    affiliate_code: str


@router.post("/apply")
async def api_apply_affiliate_code(
    body: ApplyCodeBody,
    db_session: Session = Depends(get_db_session),
):
    attr = apply_affiliate_code_to_user(body.org_id, body.user_id, body.affiliate_code, db_session)
    return {"ok": True, "attributed": bool(attr)}

