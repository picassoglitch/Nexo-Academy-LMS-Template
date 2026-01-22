import redis
from redis.exceptions import AuthenticationError, ConnectionError as RedisConnectionError
from src.db.organization_config import OrganizationConfig
from config.config import get_nexo_config
from typing import Literal, TypeAlias
from fastapi import HTTPException
from sqlmodel import Session, select

FeatureSet: TypeAlias = Literal[
    "ai",
    "analytics",
    "api",
    "assignments",
    "collaboration",
    "courses",
    "discussions",
    "members",
    "payments",
    "storage",
    "usergroups",
]


def check_limits_with_usage(
    feature: FeatureSet,
    org_id: int,
    db_session: Session,
):

    # Get the Organization Config
    statement = select(OrganizationConfig).where(OrganizationConfig.org_id == org_id)
    result = db_session.exec(statement)

    org_config = result.first()

    if org_config is None:
        raise HTTPException(
            status_code=404,
            detail="Organization has no config",
        )

    # Check if the Organizations has AI enabled
    if org_config.config["features"][feature]["enabled"] == False:
        raise HTTPException(
            status_code=403,
            detail=f"{feature.capitalize()} is not enabled for this organization",
        )

    # Check limits
    feature_limit = org_config.config["features"][feature]["limit"]

    if feature_limit > 0:
        NEXO_CONFIG = get_nexo_config()
        redis_conn_string = NEXO_CONFIG.redis_config.redis_connection_string

        if not redis_conn_string:
            raise HTTPException(
                status_code=500,
                detail="Redis connection string not found",
            )

        # Connect to Redis (only needed when limits are enforced)
        try:
            r = redis.Redis.from_url(redis_conn_string)
            r.ping()
        except (AuthenticationError, RedisConnectionError) as e:
            # If Redis is misconfigured/unavailable, we can't enforce usage limits.
            # Fail open for unlimited configs, fail closed only when limits must be enforced.
            raise HTTPException(status_code=500, detail=f"Redis unavailable for usage limits: {e}")

        # Get the number of feature usage
        feature_usage = r.get(f"{feature}_usage:{org_id}")

        # Get a number of feature asks
        if feature_usage is None:
            feature_usage_count = 0
        else:
            feature_usage_count = int(feature_usage)  # type: ignore

        # Check if the Number of usage is less than the max_asks limit
        if feature_limit <= feature_usage_count:
            raise HTTPException(
                status_code=403,
                detail=f"Usage Limit has been reached for {feature.capitalize()}",
            )
        return True

    # No limit => no need for Redis
    return True


def increase_feature_usage(
    feature: FeatureSet,
    org_id: int,
    db_session: Session,
):
    # Only track usage when a limit exists. If limit is 0/unlimited, avoid Redis dependency.
    statement = select(OrganizationConfig).where(OrganizationConfig.org_id == org_id)
    org_config = db_session.exec(statement).first()
    if not org_config:
        return True
    try:
        feature_limit = org_config.config["features"][feature]["limit"]
    except Exception:
        # If config schema is unexpected, don't block core flows.
        return True
    if not feature_limit or feature_limit <= 0:
        return True

    NEXO_CONFIG = get_nexo_config()
    redis_conn_string = NEXO_CONFIG.redis_config.redis_connection_string

    if not redis_conn_string:
        raise HTTPException(
            status_code=500,
            detail="Redis connection string not found",
        )

    # Connect to Redis
    r = redis.Redis.from_url(redis_conn_string)
    r.ping()

    # Get the number of feature usage
    feature_usage = r.get(f"{feature}_usage:{org_id}")

    # Get a number of feature asks
    if feature_usage is None:
        feature_usage_count = 0
    else:
        feature_usage_count = int(feature_usage)  # type: ignore

    # Increment the feature usage
    r.set(f"{feature}_usage:{org_id}", feature_usage_count + 1)
    return True


def decrease_feature_usage(
    feature: FeatureSet,
    org_id: int,
    db_session: Session,
):
    NEXO_CONFIG = get_nexo_config()
    redis_conn_string = NEXO_CONFIG.redis_config.redis_connection_string

    if not redis_conn_string:
        raise HTTPException(
            status_code=500,
            detail="Redis connection string not found",
        )

    # Connect to Redis
    r = redis.Redis.from_url(redis_conn_string)

    # Get the number of feature usage
    feature_usage = r.get(f"{feature}_usage:{org_id}")

    # Get a number of feature asks
    if feature_usage is None:
        feature_usage_count = 0
    else:
        feature_usage_count = int(feature_usage)  # type: ignore

    # Increment the feature usage
    r.set(f"{feature}_usage:{org_id}", feature_usage_count - 1)
    return True
