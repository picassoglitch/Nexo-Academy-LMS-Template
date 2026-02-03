"""
Site access: single-password entry for site and admin.
Passwords are stored hashed in a JSON file (or read from env as fallback).
"""
import json
import os
from pathlib import Path

from src.security.security import security_hash_password, security_verify_password

DEFAULT_SITE_PASSWORD = "sweetandsmart2026"
DEFAULT_ADMIN_PASSWORD = "sweetandsmartadmin"

# JWT subject and user_uuid for password-only access (no DB users)
SITE_ACCESS_SITE = "site"
SITE_ACCESS_ADMIN = "admin"
JWT_SUBJECT_SITE = "__site__"
JWT_SUBJECT_ADMIN = "__admin__"
USER_UUID_SITE = "user_site"
USER_UUID_ADMIN = "user_admin"


def _get_site_access_path() -> Path:
    path = os.environ.get("NEXO_SITE_ACCESS_FILE", "").strip()
    if path:
        return Path(path)
    # Default: data/site_access.json relative to repo root
    base = Path(__file__).resolve().parents[5]  # auth -> services -> src -> api -> apps -> repo root
    return base / "data" / "site_access.json"


def _read_passwords() -> tuple[str, str]:
    """Return (site_password_hash, admin_password_hash). Uses file, or bootstraps from env/defaults."""
    path = _get_site_access_path()
    env_site = os.environ.get("NEXO_SITE_PASSWORD", "").strip()
    env_admin = os.environ.get("NEXO_ADMIN_PASSWORD", "").strip()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            site_hash = data.get("site_password_hash")
            admin_hash = data.get("admin_password_hash")
            if site_hash and admin_hash:
                return (site_hash, admin_hash)
        except (json.JSONDecodeError, OSError):
            pass
    # Bootstrap file from env or defaults (hash once so verification is stable)
    site_plain = env_site or DEFAULT_SITE_PASSWORD
    admin_plain = env_admin or DEFAULT_ADMIN_PASSWORD
    site_hash = security_hash_password(site_plain)
    admin_hash = security_hash_password(admin_plain)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"site_password_hash": site_hash, "admin_password_hash": admin_hash}, f, indent=2)
    return (site_hash, admin_hash)


def verify_site_password(password: str) -> bool:
    site_hash, _ = _read_passwords()
    return security_verify_password(password, site_hash)


def verify_admin_password(password: str) -> bool:
    _, admin_hash = _read_passwords()
    return security_verify_password(password, admin_hash)


def resolve_login_access(password: str) -> str | None:
    """If password matches site or admin, return 'site' or 'admin'; else None. No DB users."""
    if verify_admin_password(password):
        return SITE_ACCESS_ADMIN
    if verify_site_password(password):
        return SITE_ACCESS_SITE
    return None


def update_passwords(site_password: str | None, admin_password: str | None) -> None:
    """Update stored passwords (admin only). Creates file if missing."""
    path = _get_site_access_path()
    site_hash, admin_hash = _read_passwords()
    if site_password is not None:
        site_hash = security_hash_password(site_password)
    if admin_password is not None:
        admin_hash = security_hash_password(admin_password)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"site_password_hash": site_hash, "admin_password_hash": admin_hash}, f, indent=2)
