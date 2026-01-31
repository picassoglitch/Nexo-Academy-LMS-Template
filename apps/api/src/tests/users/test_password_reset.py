import pytest
from fastapi import HTTPException
from sqlmodel import SQLModel, Session

from src.core.events.database import engine
from src.db.users import User
from src.db.organizations import Organization
from src.services.users import password_reset as password_reset_module


class _DummyRedis:
    def ping(self):
        return True

    def set(self, *args, **kwargs):
        return True


@pytest.mark.asyncio
async def test_send_reset_password_code_ok_even_if_user_missing(monkeypatch):
    # Arrange DB
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db:
        org = Organization(
            id=1,
            org_uuid="org_test",
            name="Test Org",
            description=None,
            about=None,
            slug="testorg",
            email="test@example.com",
            logo_image=None,
            thumbnail_image=None,
            label=None,
        )
        db.add(org)
        db.commit()

        # Patch config/redis/email so function can run in unit test
        class _Cfg:
            class _Redis:
                redis_connection_string = "redis://example"

            redis_config = _Redis()

        monkeypatch.setattr(password_reset_module, "get_nexo_config", lambda: _Cfg())
        monkeypatch.setattr(password_reset_module.redis.Redis, "from_url", lambda *_args, **_kwargs: _DummyRedis())
        monkeypatch.setattr(password_reset_module, "send_password_reset_email", lambda **_kwargs: True)

        # Act: email doesn't exist in DB
        res = await password_reset_module.send_reset_password_code(  # type: ignore[arg-type]
            request=None,
            db_session=db,
            current_user=password_reset_module.AnonymousUser(),
            org_id=1,
            email="missing@example.com",
        )

        # Assert
        assert res == {"ok": True}


@pytest.mark.asyncio
async def test_send_reset_password_code_invalid_org_id(monkeypatch):
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db:
        with pytest.raises(HTTPException) as e:
            await password_reset_module.send_reset_password_code(  # type: ignore[arg-type]
                request=None,
                db_session=db,
                current_user=password_reset_module.AnonymousUser(),
                org_id=0,
                email="user@example.com",
            )
        assert e.value.status_code == 400


@pytest.mark.asyncio
async def test_send_reset_password_code_success(monkeypatch):
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db:
        org = Organization(
            id=1,
            org_uuid="org_test",
            name="Test Org",
            description=None,
            about=None,
            slug="testorg",
            email="test@example.com",
            logo_image=None,
            thumbnail_image=None,
            label=None,
        )
        user = User(
            id=1,
            user_uuid="user_test",
            username="tester",
            first_name="Test",
            last_name="User",
            email="user@example.com",
        )
        db.add(org)
        db.add(user)
        db.commit()

        class _Cfg:
            class _Redis:
                redis_connection_string = "redis://example"

            redis_config = _Redis()

        monkeypatch.setattr(password_reset_module, "get_nexo_config", lambda: _Cfg())
        monkeypatch.setattr(password_reset_module.redis.Redis, "from_url", lambda *_args, **_kwargs: _DummyRedis())
        monkeypatch.setattr(password_reset_module, "send_password_reset_email", lambda **_kwargs: True)

        res = await password_reset_module.send_reset_password_code(  # type: ignore[arg-type]
            request=None,
            db_session=db,
            current_user=password_reset_module.AnonymousUser(),
            org_id=1,
            email="user@example.com",
        )

        assert res == {"ok": True}

