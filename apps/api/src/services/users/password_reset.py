from datetime import datetime
import json
import random
import redis
import string
import uuid
import logging
from fastapi import HTTPException, Request
from pydantic import EmailStr
from sqlmodel import Session, select
from src.db.organizations import Organization, OrganizationRead
from src.security.security import security_hash_password
from config.config import get_nexo_config
from src.services.users.emails import (
    send_password_reset_email,
)
from src.db.users import (
    AnonymousUser,
    PublicUser,
    User,
    UserRead,
)

logger = logging.getLogger(__name__)


async def send_reset_password_code(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    org_id: int,
    email: EmailStr,
):
    # Validate org id early
    if not isinstance(org_id, int) or org_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid org_id")

    logger.info("password_reset.send_reset_code start", extra={"org_id": org_id, "email": str(email)})

    # Get org
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()

    if not org:
        raise HTTPException(
            status_code=400,
            detail="Organization not found",
        )

    # Get user (avoid user enumeration: return ok even if not found)
    statement = select(User).where(User.email == email)
    user = db_session.exec(statement).first()
    if not user:
        logger.info(
            "password_reset.send_reset_code email not found (no-op)",
            extra={"org_id": org_id, "email": str(email)},
        )
        return {"ok": True}

    # Redis init
    NEXO_CONFIG = get_nexo_config()
    redis_conn_string = NEXO_CONFIG.redis_config.redis_connection_string

    if not redis_conn_string:
        logger.error("password_reset.send_reset_code missing redis_connection_string")
        raise HTTPException(status_code=500, detail="Internal configuration error")

    # Connect to Redis
    try:
        r = redis.Redis.from_url(redis_conn_string)
        # Force a quick ping so misconfigurations fail here (and get logged).
        r.ping()
    except Exception:
        logger.exception("password_reset.send_reset_code redis connection failed")
        raise HTTPException(status_code=500, detail="Internal server error")

    # Generate reset code
    def generate_code(length=5):
        letters_and_digits = string.ascii_letters + string.digits
        return "".join(random.choice(letters_and_digits) for _ in range(length))

    generated_reset_code = generate_code()
    reset_email_invite_uuid = f"reset_email_invite_code_{uuid.uuid4()}"

    expires_at = int(datetime.now().timestamp()) + 60 * 60 * 1  # 1 hour
    ex_seconds = 60 * 60 * 1

    resetCodeObject = {
        "reset_code": generated_reset_code,
        "reset_email_invite_uuid": reset_email_invite_uuid,
        "reset_code_expires": expires_at,
        "reset_code_type": "signup",
        "created_at": datetime.now().isoformat(),
        "created_by": user.user_uuid,
        "org_uuid": org.org_uuid,
    }

    redis_key = f"{reset_email_invite_uuid}:user:{user.user_uuid}:org:{org.org_uuid}:code:{generated_reset_code}"
    try:
        r.set(redis_key, json.dumps(resetCodeObject), ex=ex_seconds)
    except Exception:
        logger.exception("password_reset.send_reset_code failed writing reset code to redis")
        raise HTTPException(status_code=500, detail="Internal server error")

    user = UserRead.model_validate(user)

    org = OrganizationRead.model_validate(org)

    # Send reset code via email
    try:
        logger.info(
            "password_reset.send_reset_code sending email",
            extra={"org_id": org_id, "email": str(email), "redis_key": redis_key},
        )
        is_email_sent = send_password_reset_email(
            generated_reset_code=generated_reset_code,
            user=user,
            organization=org,
            email=user.email,
        )
    except Exception:
        logger.exception("password_reset.send_reset_code email provider threw")
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    if not is_email_sent:
        logger.error("password_reset.send_reset_code email provider returned false")
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    logger.info("password_reset.send_reset_code success", extra={"org_id": org_id, "email": str(email)})
    return {"ok": True}


async def change_password_with_reset_code(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    new_password: str,
    org_id: int,
    email: EmailStr,
    reset_code: str,
):
    # Get user
    statement = select(User).where(User.email == email)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # Get org
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()

    if not org:
        raise HTTPException(
            status_code=400,
            detail="Organization not found",
        )

    # Redis init
    NEXO_CONFIG = get_nexo_config()
    redis_conn_string = NEXO_CONFIG.redis_config.redis_connection_string

    if not redis_conn_string:
        raise HTTPException(
            status_code=500,
            detail="Redis connection string not found",
        )

    # Connect to Redis
    r = redis.Redis.from_url(redis_conn_string)

    if not r:
        raise HTTPException(
            status_code=500,
            detail="Could not connect to Redis",
        )

    # Get reset code
    reset_code_key = f"*:user:{user.user_uuid}:org:{org.org_uuid}:code:{reset_code}"
    keys = r.keys(reset_code_key)

    if not keys:
        raise HTTPException(
            status_code=400,
            detail="Reset code not found",
        )

    # Get reset code object
    reset_code_value = r.get(keys[0])

    if reset_code_value is None:
        raise HTTPException(
            status_code=400,
            detail="Reset code value not found",
        )
    reset_code_object = json.loads(reset_code_value)

    # Check if reset code is expired
    if reset_code_object["reset_code_expires"] < int(datetime.now().timestamp()):
        raise HTTPException(
            status_code=400,
            detail="Reset code expired",
        )

    # Change password
    user.password = security_hash_password(new_password)
    db_session.add(user)

    db_session.commit()
    db_session.refresh(user)

    # Delete reset code
    r.delete(keys[0])

    return "Password changed"
