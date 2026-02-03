from datetime import timedelta
from typing import Literal, Optional
from fastapi import Depends, APIRouter, HTTPException, Response, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlmodel import Session
from src.db.users import AnonymousUser, PublicUser, UserRead
from src.core.events.database import get_db_session
from config.config import get_nexo_config
from src.security.auth import AuthJWT, authenticate_user, get_current_user
from src.services.auth.utils import signWithGoogle
from src.services.auth.site_access import (
    resolve_login_access,
    update_passwords as site_access_update_passwords,
    JWT_SUBJECT_SITE,
    JWT_SUBJECT_ADMIN,
    USER_UUID_SITE,
    USER_UUID_ADMIN,
)
from src.services.users.users import get_user_session
from src.services.dev.dev import isDevModeEnabled


router = APIRouter()


# ---------------------------------------------------------------------------
# Site access (single-password entry, no registration)
# ---------------------------------------------------------------------------

class SiteLoginBody(BaseModel):
    password: str


def _synthetic_user_read(is_admin: bool) -> UserRead:
    """Synthetic user for password-only access (no DB user)."""
    return UserRead(
        id=-1 if is_admin else 0,
        user_uuid=USER_UUID_ADMIN if is_admin else USER_UUID_SITE,
        username="Admin" if is_admin else "Member",
        first_name="Admin" if is_admin else "Site",
        last_name="",
        email="admin@nexo.local" if is_admin else "site@nexo.local",
        avatar_image="",
        bio="",
        details={},
        profile={},
    )


@router.post("/site-login")
async def site_login(
    body: SiteLoginBody,
    request: Request,
    response: Response,
    Authorize: AuthJWT = Depends(),
):
    """Login with site or admin password only. No users in DB—just passwords."""
    access = resolve_login_access(body.password)
    if not access:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    is_admin = access == "admin"
    subject = JWT_SUBJECT_ADMIN if is_admin else JWT_SUBJECT_SITE
    access_token = Authorize.create_access_token(subject=subject)
    refresh_token = Authorize.create_refresh_token(subject=subject)
    Authorize.set_refresh_cookies(refresh_token)
    cookie_domain = None if isDevModeEnabled() else get_nexo_config().hosting_config.cookie_config.domain
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=False,
        domain=cookie_domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )
    user_read = _synthetic_user_read(is_admin)
    return {
        "user": user_read,
        "tokens": {"access_token": access_token, "refresh_token": refresh_token},
    }


def _has_dashboard_access(session_data: dict) -> bool:
    roles = session_data.get("roles") or []
    for r in roles:
        role = r.get("role") or {}
        rights = role.get("rights") or {}
        dash = rights.get("dashboard") or {}
        if dash.get("action_access"):
            return True
    return False


async def require_admin(
    request: Request,
    db_session: Session = Depends(get_db_session),
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
) -> PublicUser:
    if isinstance(current_user, AnonymousUser) or getattr(current_user, "user_uuid", None) in (None, "user_anonymous"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    session_data = await get_user_session(request, db_session, current_user)
    data = session_data.model_dump() if hasattr(session_data, "model_dump") else session_data
    if not _has_dashboard_access(data):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


class SitePasswordsUpdateBody(BaseModel):
    site_password: Optional[str] = None
    admin_password: Optional[str] = None


@router.get("/site-passwords")
async def get_site_passwords(_: PublicUser = Depends(require_admin)):
    """Return whether site passwords are configured (admin only). Values are masked."""
    return {"configured": True, "message": "Passwords are configured. Use PATCH to update."}


@router.patch("/site-passwords")
async def patch_site_passwords(
    body: SitePasswordsUpdateBody,
    _: PublicUser = Depends(require_admin),
):
    """Update site and/or admin password (admin only)."""
    if body.site_password is None and body.admin_password is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one of site_password or admin_password")
    site_access_update_passwords(body.site_password, body.admin_password)
    return {"message": "Passwords updated"}


@router.get("/refresh")
def refresh(response: Response, Authorize: AuthJWT = Depends()):
    """
    The jwt_refresh_token_required() function insures a valid refresh
    token is present in the request before running any code below that function.
    we can use the get_jwt_subject() function to get the subject of the refresh
    token, and use the create_access_token() function again to make a new access token
    """
    Authorize.jwt_refresh_token_required()

    current_user = Authorize.get_jwt_subject()
    new_access_token = Authorize.create_access_token(subject=current_user)  # type: ignore
    cookie_domain = None if isDevModeEnabled() else get_nexo_config().hosting_config.cookie_config.domain

    response.set_cookie(
        key="access_token_cookie",
        value=new_access_token,
        httponly=False,
        domain=cookie_domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )
    return {"access_token": new_access_token}


@router.post("/login")
async def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    Authorize: AuthJWT = Depends(),
    db_session: Session = Depends(get_db_session),
):
    user = await authenticate_user(
        request, username, password, db_session
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = Authorize.create_access_token(subject=username)
    refresh_token = Authorize.create_refresh_token(subject=username)
    Authorize.set_refresh_cookies(refresh_token)
    cookie_domain = None if isDevModeEnabled() else get_nexo_config().hosting_config.cookie_config.domain

    # set cookies using fastapi
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=False,
        domain=cookie_domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )

    user = UserRead.model_validate(user)

    result = {
        "user": user,
        "tokens": {"access_token": access_token, "refresh_token": refresh_token},
    }
    return result


class ThirdPartyLogin(BaseModel):
    email: EmailStr
    provider: Literal["google"]
    access_token: str


@router.post("/oauth")
async def third_party_login(
    request: Request,
    response: Response,
    body: ThirdPartyLogin,
    org_id: Optional[int] = None,
    current_user: AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
    Authorize: AuthJWT = Depends(),
):
    # Google
    if body.provider == "google":

        user = await signWithGoogle(
            request, body.access_token, body.email, org_id, current_user, db_session
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = Authorize.create_access_token(subject=user.email)
    refresh_token = Authorize.create_refresh_token(subject=user.email)
    Authorize.set_refresh_cookies(refresh_token)
    cookie_domain = None if isDevModeEnabled() else get_nexo_config().hosting_config.cookie_config.domain

    # set cookies using fastapi
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=False,
        domain=cookie_domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )

    user = UserRead.model_validate(user)

    result = {
        "user": user,
        "tokens": {"access_token": access_token, "refresh_token": refresh_token},
    }
    return result


@router.delete("/logout")
def logout(Authorize: AuthJWT = Depends()):
    """
    Because the JWT are stored in an httponly cookie now, we cannot
    log the user out by simply deleting the cookies in the frontend.
    We need the backend to send us a response to delete the cookies.
    """
    Authorize.jwt_required()

    Authorize.unset_jwt_cookies()
    return {"msg": "Successfully logout"}
