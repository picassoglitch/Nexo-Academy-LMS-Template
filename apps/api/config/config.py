import os
import yaml
from typing import Literal, Optional
from pydantic import BaseModel


def _first_env(*keys: str) -> str | None:
    """
    Return first non-empty environment variable value from keys.
    Uses os.getenv only (no .env file dependency).
    """
    for key in keys:
        val = os.getenv(key)
        if val is not None and str(val).strip() != "":
            return str(val)
    return None


class CookieConfig(BaseModel):
    domain: str


class GeneralConfig(BaseModel):
    development_mode: bool
    logfire_enabled: bool


class SecurityConfig(BaseModel):
    auth_jwt_secret_key: str


class AIConfig(BaseModel):
    openai_api_key: str | None
    is_ai_enabled: bool | None


class S3ApiConfig(BaseModel):
    bucket_name: str | None
    endpoint_url: str | None


class ContentDeliveryConfig(BaseModel):
    type: Literal["filesystem", "s3api"]
    # When type="filesystem", store uploaded media under this directory.
    # In production (e.g. Render), point this to a persistent disk mount like "/data/content".
    filesystem_root: str | None = None
    s3api: S3ApiConfig


class HostingConfig(BaseModel):
    domain: str
    ssl: bool
    port: int
    use_default_org: bool
    allowed_origins: list
    allowed_regexp: str
    self_hosted: bool
    cookie_config: CookieConfig
    content_delivery: ContentDeliveryConfig


class MailingConfig(BaseModel):
    resend_api_key: str
    system_email_address: str


class DatabaseConfig(BaseModel):
    sql_connection_string: Optional[str]


class RedisConfig(BaseModel):
    redis_connection_string: Optional[str]


class InternalStripeConfig(BaseModel):
    stripe_secret_key: str | None
    stripe_publishable_key: str | None
    stripe_webhook_standard_secret: str | None
    stripe_webhook_connect_secret: str | None
    stripe_client_id: str | None


class InternalPaymentsConfig(BaseModel):
    stripe: InternalStripeConfig


class NexoConfig(BaseModel):
    site_name: str
    site_description: str
    contact_email: str
    general_config: GeneralConfig
    hosting_config: HostingConfig
    database_config: DatabaseConfig
    redis_config: RedisConfig
    security_config: SecurityConfig
    ai_config: AIConfig
    mailing_config: MailingConfig
    payments_config: InternalPaymentsConfig


def get_nexo_config() -> NexoConfig:

    # Get the YAML file
    yaml_path = os.path.join(os.path.dirname(__file__), "config.yaml")

    # Load the YAML file
    with open(yaml_path, "r", encoding="utf-8") as f:
        yaml_config = yaml.safe_load(f)
    
    # Ensure yaml_config is not None (defensive programming)
    if yaml_config is None:
        yaml_config = {}

    # General Config

    # Development Mode
    # Render-style: ENV=production
    env_env = _first_env("ENV", "NODE_ENV")

    env_development_mode_str = _first_env("NEXO_DEVELOPMENT_MODE")
    if env_development_mode_str is not None:
        env_development_mode = env_development_mode_str.lower() in ("true", "1", "yes")
    elif env_env and env_env.lower() == "production":
        env_development_mode = False
    else:
        env_development_mode = None
    development_mode = (
        env_development_mode
        if env_development_mode is not None
        else yaml_config.get("general", {}).get("development_mode")
    )

    # Logfire config
    env_logfire_enabled = os.environ.get("NEXO_LOGFIRE_ENABLED", "None")
    logfire_enabled = (
        env_logfire_enabled.lower() == "true" if env_logfire_enabled != "None"
        else yaml_config.get("general", {}).get("logfire_enabled", False)
    )

    # Security Config
    # Support:
    # - NEXO_* (this project)
    # - LEARNHOUSE_* (upstream)
    # - Render-style generic names
    env_auth_jwt_secret_key = _first_env(
        "NEXO_AUTH_JWT_SECRET_KEY",
        "LEARNHOUSE_AUTH_JWT_SECRET_KEY",
        "JWT_SECRET",
    )
    auth_jwt_secret_key = env_auth_jwt_secret_key or yaml_config.get(
        "security", {}
    ).get("auth_jwt_secret_key")

    # Check if environment variables are defined
    env_site_name = _first_env("NEXO_SITE_NAME", "LEARNHOUSE_SITE_NAME")
    env_site_description = _first_env("NEXO_SITE_DESCRIPTION", "LEARNHOUSE_SITE_DESCRIPTION")
    env_contact_email = _first_env("NEXO_CONTACT_EMAIL", "LEARNHOUSE_CONTACT_EMAIL")
    env_domain = _first_env("NEXO_DOMAIN", "LEARNHOUSE_DOMAIN")
    env_ssl = _first_env("NEXO_SSL", "LEARNHOUSE_SSL")
    env_port = _first_env("NEXO_PORT", "LEARNHOUSE_PORT", "PORT")
    env_use_default_org = _first_env("NEXO_USE_DEFAULT_ORG", "LEARNHOUSE_USE_DEFAULT_ORG")
    env_allowed_origins = _first_env("NEXO_ALLOWED_ORIGINS", "LEARNHOUSE_ALLOWED_ORIGINS")
    env_cookie_domain = _first_env("NEXO_COOKIE_DOMAIN", "LEARNHOUSE_COOKIE_DOMAIN")

    # Allowed origins should be a comma separated string
    if env_allowed_origins:
        # Render/UI often inserts spaces/newlines; normalize to avoid CORS mismatches.
        env_allowed_origins = [x.strip() for x in env_allowed_origins.split(",") if x.strip()]
    env_allowed_regexp = _first_env("NEXO_ALLOWED_REGEXP", "LEARNHOUSE_ALLOWED_REGEXP")
    env_self_hosted = _first_env("NEXO_SELF_HOSTED", "LEARNHOUSE_SELF_HOSTED")
    env_sql_connection_string = _first_env(
        "NEXO_SQL_CONNECTION_STRING",
        "LEARNHOUSE_SQL_CONNECTION_STRING",
        "DATABASE_URL",
    )

    

    # Fill in values with YAML file if they are not provided
    site_name = env_site_name or yaml_config.get("site_name")
    site_description = env_site_description or yaml_config.get("site_description")
    contact_email = env_contact_email or yaml_config.get("contact_email")

    domain = env_domain or yaml_config.get("hosting_config", {}).get("domain")
    ssl = env_ssl or yaml_config.get("hosting_config", {}).get("ssl")
    port = env_port or yaml_config.get("hosting_config", {}).get("port")
    use_default_org = env_use_default_org or yaml_config.get("hosting_config", {}).get(
        "use_default_org"
    )
    allowed_origins = env_allowed_origins or yaml_config.get("hosting_config", {}).get(
        "allowed_origins"
    )
    allowed_regexp = env_allowed_regexp or yaml_config.get("hosting_config", {}).get(
        "allowed_regexp"
    )
    self_hosted = env_self_hosted or yaml_config.get("hosting_config", {}).get(
        "self_hosted"
    )

    cookies_domain = env_cookie_domain or yaml_config.get("hosting_config", {}).get(
        "cookies_config", {}
    ).get("domain")
    cookie_config = CookieConfig(domain=cookies_domain)

    env_content_delivery_type = os.environ.get("NEXO_CONTENT_DELIVERY_TYPE")
    content_delivery_type: str = env_content_delivery_type or (
        (yaml_config.get("hosting_config", {}).get("content_delivery", {}).get("type"))
        or "filesystem"
    )  # default to filesystem

    env_bucket_name = os.environ.get("NEXO_S3_API_BUCKET_NAME")
    env_endpoint_url = os.environ.get("NEXO_S3_API_ENDPOINT_URL")
    bucket_name = (
        yaml_config.get("hosting_config", {})
        .get("content_delivery", {})
        .get("s3api", {})
        .get("bucket_name")
    ) or env_bucket_name
    endpoint_url = (
        yaml_config.get("hosting_config", {})
        .get("content_delivery", {})
        .get("s3api", {})
        .get("endpoint_url")
    ) or env_endpoint_url

    # Content (uploads) root directory
    # NOTE: Render containers lose their filesystem on restart unless you attach a persistent disk.
    env_content_root = _first_env("NEXO_CONTENT_ROOT", "LEARNHOUSE_CONTENT_ROOT", "CONTENT_ROOT")
    yaml_content_root = (
        yaml_config.get("hosting_config", {})
        .get("content_delivery", {})
        .get("filesystem_root")
    )
    content_root = (env_content_root or yaml_content_root or "content").strip()

    content_delivery = ContentDeliveryConfig(
        type=content_delivery_type,  # type: ignore
        filesystem_root=content_root if content_delivery_type == "filesystem" else None,
        s3api=S3ApiConfig(bucket_name=bucket_name, endpoint_url=endpoint_url),  # type: ignore
    )

    # Database config
    sql_connection_string = env_sql_connection_string or yaml_config.get(
        "database_config", {}
    ).get("sql_connection_string")

    # AI Config
    env_openai_api_key = _first_env("NEXO_OPENAI_API_KEY")
    env_is_ai_enabled_str = _first_env("NEXO_IS_AI_ENABLED")
    
    openai_api_key = env_openai_api_key or yaml_config.get("ai_config", {}).get(
        "openai_api_key"
    )
    
    # Parse is_ai_enabled from env or yaml
    if env_is_ai_enabled_str:
        is_ai_enabled = env_is_ai_enabled_str.lower() in ("true", "1", "yes")
    else:
        is_ai_enabled = yaml_config.get("ai_config", {}).get("is_ai_enabled", False)

    # Redis config
    env_redis_connection_string = _first_env(
        "NEXO_REDIS_CONNECTION_STRING",
        "LEARNHOUSE_REDIS_CONNECTION_STRING",
        "REDIS_URL",
    )
    redis_connection_string = env_redis_connection_string or yaml_config.get(
        "redis_config", {}
    ).get("redis_connection_string")

    # Mailing config
    env_resend_api_key = _first_env("NEXO_RESEND_API_KEY", "EMAIL_API_KEY")
    env_system_email_address = _first_env("NEXO_SYSTEM_EMAIL_ADDRESS")
    resend_api_key = env_resend_api_key or yaml_config.get("mailing_config", {}).get(
        "resend_api_key"
    )
    system_email_address = env_system_email_address or yaml_config.get(
        "mailing_config", {}
    ).get("system_email_address")

    # Payments config
    env_stripe_secret_key = _first_env(
        "NEXO_STRIPE_SECRET_KEY",
        "LEARNHOUSE_STRIPE_SECRET_KEY",
        "STRIPE_SECRET_KEY",
    )
    env_stripe_publishable_key = _first_env(
        "NEXO_STRIPE_PUBLISHABLE_KEY",
        "LEARNHOUSE_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PUBLISHABLE_KEY",
    )
    env_stripe_webhook_standard_secret = _first_env(
        "NEXO_STRIPE_WEBHOOK_STANDARD_SECRET",
        "LEARNHOUSE_STRIPE_WEBHOOK_STANDARD_SECRET",
        "STRIPE_WEBHOOK_SECRET",
    )
    env_stripe_webhook_connect_secret = _first_env(
        "NEXO_STRIPE_WEBHOOK_CONNECT_SECRET",
        "LEARNHOUSE_STRIPE_WEBHOOK_CONNECT_SECRET",
        "STRIPE_CONNECT_WEBHOOK_SECRET",
        "STRIPE_CONNECT_WEBHOOK_SECRET",
    )
    env_stripe_client_id = _first_env(
        "NEXO_STRIPE_CLIENT_ID",
        "LEARNHOUSE_STRIPE_CLIENT_ID",
        "STRIPE_CLIENT_ID",
    )
    
    stripe_secret_key = env_stripe_secret_key or yaml_config.get("payments_config", {}).get(
        "stripe", {}
    ).get("stripe_secret_key")
    
    stripe_publishable_key = env_stripe_publishable_key or yaml_config.get("payments_config", {}).get(
        "stripe", {}
    ).get("stripe_publishable_key")

    stripe_webhook_standard_secret = env_stripe_webhook_standard_secret or yaml_config.get("payments_config", {}).get(
        "stripe", {}
    ).get("stripe_webhook_standard_secret")

    stripe_webhook_connect_secret = env_stripe_webhook_connect_secret or yaml_config.get("payments_config", {}).get(
        "stripe", {}
    ).get("stripe_webhook_connect_secret")

    stripe_client_id = env_stripe_client_id or yaml_config.get("payments_config", {}).get(
        "stripe", {}
    ).get("stripe_client_id")

    # Create HostingConfig and DatabaseConfig objects
    hosting_config = HostingConfig(
        domain=domain,
        ssl=bool(ssl),
        port=int(port),
        use_default_org=bool(use_default_org),
        allowed_origins=list(allowed_origins),
        allowed_regexp=allowed_regexp,
        self_hosted=bool(self_hosted),
        cookie_config=cookie_config,
        content_delivery=content_delivery,
    )
    database_config = DatabaseConfig(
        sql_connection_string=sql_connection_string,
    )

    # AI Config
    ai_config = AIConfig(
        openai_api_key=openai_api_key,
        is_ai_enabled=bool(is_ai_enabled),
    )

    # Create NexoConfig object
    config = NexoConfig(
        site_name=site_name,
        site_description=site_description,
        contact_email=contact_email,
        general_config=GeneralConfig(
            development_mode=bool(development_mode), 
            logfire_enabled=bool(logfire_enabled)
        ),
        hosting_config=hosting_config,
        database_config=database_config,
        security_config=SecurityConfig(auth_jwt_secret_key=auth_jwt_secret_key),
        ai_config=ai_config,
        redis_config=RedisConfig(redis_connection_string=redis_connection_string),
        mailing_config=MailingConfig(
            resend_api_key=resend_api_key, system_email_address=system_email_address
        ),
        payments_config=InternalPaymentsConfig(
            stripe=InternalStripeConfig(
                stripe_secret_key=stripe_secret_key,
                stripe_publishable_key=stripe_publishable_key,
                stripe_webhook_standard_secret=stripe_webhook_standard_secret,
                stripe_webhook_connect_secret=stripe_webhook_connect_secret,
                stripe_client_id=stripe_client_id
            )
        )
    )

    return config
