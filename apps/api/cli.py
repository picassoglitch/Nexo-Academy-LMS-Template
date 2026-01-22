import os
from typing import Annotated
from pydantic import EmailStr
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session
import typer
from config.config import get_nexo_config
from src.db.organizations import OrganizationCreate
from src.db.users import UserCreate
from src.services.setup.setup import (
    install_create_organization,
    install_create_organization_user,
    install_default_elements,
)

cli = typer.Typer()

DEFAULT_ORG_SLUG = "defaultorg"

@cli.command()
def install(
    short: Annotated[bool, typer.Option(help="Install with predefined values")] = False
):
    # Get the database session
    nexo_config = get_nexo_config()
    engine = create_engine(
        nexo_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True  # type: ignore
    )
    SQLModel.metadata.create_all(engine)

    db_session = Session(engine)

    if short:
        # Install the default elements
        print("Installing default elements...")
        install_default_elements(db_session)
        print("Default elements installed ✅")

        # Create the Organization
        print("Creating default organization...")
        org = OrganizationCreate(
            name="Default Organization",
            description="Default Organization",
            slug=DEFAULT_ORG_SLUG,
            email="",
            logo_image="",
            thumbnail_image="",
            about="",
            label="",
        )
        install_create_organization(org, db_session)
        print("Default organization created ✅")

        # Create Organization User
        print("Creating default organization user...")
        # Use email from environment variable if provided, otherwise default to "admin@school.dev"
        email = os.environ.get("NEXO_INITIAL_ADMIN_EMAIL") or os.environ.get("LEARNHOUSE_INITIAL_ADMIN_EMAIL", "admin@school.dev")
        # Require password from environment variable
        password = os.environ.get("NEXO_INITIAL_ADMIN_PASSWORD") or os.environ.get("LEARNHOUSE_INITIAL_ADMIN_PASSWORD")
        if not password:
            print("❌ Error: NEXO_INITIAL_ADMIN_PASSWORD (or LEARNHOUSE_INITIAL_ADMIN_PASSWORD) environment variable is required")
            print("Please set NEXO_INITIAL_ADMIN_PASSWORD (or LEARNHOUSE_INITIAL_ADMIN_PASSWORD) before running installation.")
            raise typer.Exit(code=1)
        print("Using password from NEXO_INITIAL_ADMIN_PASSWORD / LEARNHOUSE_INITIAL_ADMIN_PASSWORD environment variable")
        if email != "admin@school.dev":
            print(f"Using email from NEXO_INITIAL_ADMIN_EMAIL / LEARNHOUSE_INITIAL_ADMIN_EMAIL environment variable: {email}")
        user = UserCreate(
            username="admin", email=EmailStr(email), password=password
        )
        install_create_organization_user(user, DEFAULT_ORG_SLUG, db_session)
        print("Default organization user created ✅")

        # Show the user how to login
        print("Installation completed ✅")
        print("")
        print("Login with the following credentials:")
        print("email: " + email)
        print("password: (the password you set in NEXO_INITIAL_ADMIN_PASSWORD / LEARNHOUSE_INITIAL_ADMIN_PASSWORD)")
        print("⚠️ Remember to change the password after logging in ⚠️")

    else:
        # Install the default elements
        print("Installing default elements...")
        install_default_elements(db_session)
        print("Default elements installed ✅")

        # Create the Organization
        print("Creating your organization...")
        orgname = typer.prompt("What's shall we call your organization?")
        slug = typer.prompt(
            "What's the slug for your organization? (e.g. school, acme)"
        )
        org = OrganizationCreate(
            name=orgname,
            description="Default Organization",
            slug=slug.lower(),
            email="",
            logo_image="",
            thumbnail_image="",
            about="",
            label="",
        )
        install_create_organization(org, db_session)
        print(orgname + " Organization created ✅")

        # Create Organization User
        print("Creating your organization user...")
        username = typer.prompt("What's the username for the user?")
        email = typer.prompt("What's the email for the user?")
        password = typer.prompt("What's the password for the user?", hide_input=True)
        user = UserCreate(username=username, email=EmailStr(email), password=password)
        install_create_organization_user(user, slug, db_session)
        print(username + " user created ✅")

        # Show the user how to login
        print("Installation completed ✅")
        print("")
        print("Login with the following credentials:")
        print("email: " + email)
        print("password: The password you entered")




@cli.command()
def main():
    cli()


@cli.command("rename-org-slug")
def rename_org_slug(old_slug: str, new_slug: str):
    """
    Rename an organization slug (useful when the default org was created with a previous slug).

    Example:
      uv run cli.py rename-org-slug default defaultorg
    """
    from sqlmodel import select
    from src.db.organizations import Organization

    nexo_config = get_nexo_config()
    engine = create_engine(
        nexo_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True  # type: ignore
    )

    with Session(engine) as session:
        org = session.exec(select(Organization).where(Organization.slug == old_slug)).first()
        if not org:
            print(f"ERROR: Organization with slug '{old_slug}' not found")
            raise typer.Exit(code=1)

        existing = session.exec(select(Organization).where(Organization.slug == new_slug)).first()
        if existing:
            print(f"ERROR: Target slug '{new_slug}' already exists")
            raise typer.Exit(code=1)

        org.slug = new_slug
        session.add(org)
        session.commit()
        print(f"OK: Renamed org slug: {old_slug} -> {new_slug}")


@cli.command("make-super-admin")
def make_super_admin(email: str, org_slug: str = DEFAULT_ORG_SLUG):
    """
    Promote a user to org admin (role_id=1) for an org. This effectively grants
    "super admin" capabilities in this codebase (RBAC checks role IDs 1/2 as admin).

    Example:
      uv run cli.py make-super-admin picassoglitch@gmail.com --org-slug defaultorg
    """
    from datetime import datetime
    from sqlmodel import select
    from src.db.organizations import Organization
    from src.db.users import User
    from src.db.user_organizations import UserOrganization

    nexo_config = get_nexo_config()
    engine = create_engine(
        nexo_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True  # type: ignore
    )

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            print(f"ERROR: User not found with email '{email}'")
            raise typer.Exit(code=1)

        org = session.exec(select(Organization).where(Organization.slug == org_slug)).first()
        if not org:
            print(f"ERROR: Organization not found with slug '{org_slug}'")
            raise typer.Exit(code=1)

        link = session.exec(
            select(UserOrganization).where(
                UserOrganization.user_id == user.id, UserOrganization.org_id == org.id
            )
        ).first()

        now = str(datetime.now())
        if not link:
            link = UserOrganization(
                user_id=int(user.id),
                org_id=int(org.id),
                role_id=1,
                creation_date=now,
                update_date=now,
            )
            session.add(link)
        else:
            link.role_id = 1
            link.update_date = now
            session.add(link)

        # Optional: mark email as verified for admin convenience
        try:
            user.email_verified = True
            session.add(user)
        except Exception:
            pass

        session.commit()
        print(f"OK: '{email}' is now admin (role_id=1) in org '{org_slug}'")


@cli.command("set-org-feature")
def set_org_feature(
    org_slug: str,
    feature: str,
    enabled: bool = typer.Option(True, "--enabled/--disabled"),
):
    """
    Enable/disable an organization feature flag in OrganizationConfig.

    Example:
      uv run cli.py set-org-feature defaultorg payments --enabled
    """
    from datetime import datetime
    from sqlmodel import select
    from src.db.organizations import Organization
    from src.db.organization_config import OrganizationConfig

    nexo_config = get_nexo_config()
    engine = create_engine(
        nexo_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True  # type: ignore
    )

    with Session(engine) as session:
        org = session.exec(select(Organization).where(Organization.slug == org_slug)).first()
        if not org:
            print(f"ERROR: Organization not found with slug '{org_slug}'")
            raise typer.Exit(code=1)

        cfg = session.exec(select(OrganizationConfig).where(OrganizationConfig.org_id == org.id)).first()
        if not cfg:
            print(f"ERROR: Organization config not found for org '{org_slug}'")
            raise typer.Exit(code=1)

        # IMPORTANT: config is stored in a JSON column; in-place mutation may not be detected.
        # Always assign a new dict object to ensure SQLAlchemy persists the change.
        from copy import deepcopy
        new_config = deepcopy(cfg.config or {})
        new_config.setdefault("features", {})
        new_config["features"].setdefault(feature, {})
        new_config["features"][feature]["enabled"] = bool(enabled)
        cfg.config = new_config
        cfg.update_date = str(datetime.now())

        session.add(cfg)
        session.commit()

        print(f"OK: org '{org_slug}' feature '{feature}' enabled={bool(enabled)}")


if __name__ == "__main__":
    cli()
