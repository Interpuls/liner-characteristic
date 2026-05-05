from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select
from datetime import datetime

from app.auth import get_current_user, hash_password, verify_password
from app.common.enums import UserRole
from app.db import get_session
from app.main import app
from app.model.user import User
from app.model.login_event import LoginEvent
from app.model.security_event import SecurityEvent
from app.model.audit_log import AuditLog
from app.model.access_log import AccessLog
from app.model.setting_comparison_preference import SettingComparisonPreference
from app.model.search import SearchPreference


def build_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def build_client(*, role=UserRole.USER):
    engine = build_engine()
    SQLModel.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            LoginEvent.__table__,
            SecurityEvent.__table__,
            AuditLog.__table__,
            AccessLog.__table__,
            SettingComparisonPreference.__table__,
            SearchPreference.__table__,
        ],
    )

    with Session(engine, expire_on_commit=False) as session:
        user = User(
            email="tester@milkrite-interpuls.com",
            hashed_password=hash_password("old-password"),
            role=role,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        def override_get_session():
            yield session

        def override_get_current_user():
            return user

        app.dependency_overrides[get_session] = override_get_session
        app.dependency_overrides[get_current_user] = override_get_current_user

        client = TestClient(app)
        return client, session, user


def teardown_client(client):
    client.close()
    app.dependency_overrides.clear()


def test_change_my_password_updates_hash():
    client, session, user = build_client()
    try:
        response = client.put(
            "/users/me/password",
            json={
                "current_password": "old-password",
                "new_password": "new-password",
            },
        )
        assert response.status_code == 204

        session.refresh(user)
        assert verify_password("new-password", user.hashed_password)
        assert user.is_first_login is False
    finally:
        teardown_client(client)


def test_change_my_password_rejects_wrong_current_password():
    client, _session, _user = build_client()
    try:
        response = client.put(
            "/users/me/password",
            json={
                "current_password": "wrong-password",
                "new_password": "new-password",
            },
        )
        assert response.status_code == 401
    finally:
        teardown_client(client)


def test_admin_can_reset_another_user_password():
    client, session, _user = build_client(role=UserRole.ADMIN)
    try:
        target = User(
            email="another@milkrite-interpuls.com",
            hashed_password=hash_password("initial-password"),
        )
        session.add(target)
        session.commit()
        session.refresh(target)

        response = client.put(
            f"/users/{target.id}/password-reset",
            json={"new_password": "reset-password"},
        )
        assert response.status_code == 204

        session.refresh(target)
        assert verify_password("reset-password", target.hashed_password)
        assert target.is_first_login is True
    finally:
        teardown_client(client)


def test_admin_password_reset_returns_404_for_missing_user():
    client, _session, _user = build_client(role=UserRole.ADMIN)
    try:
        response = client.put(
            "/users/999999/password-reset",
            json={"new_password": "reset-password"},
        )
        assert response.status_code == 404
    finally:
        teardown_client(client)


def test_admin_can_delete_user_with_related_logs():
    client, session, admin = build_client(role=UserRole.ADMIN)
    try:
        target = User(
            email="another@milkrite-interpuls.com",
            hashed_password=hash_password("initial-password"),
        )
        session.add(target)
        session.commit()
        session.refresh(target)

        session.add(LoginEvent(user_id=target.id, email_attempted="another@milkrite-interpuls.com", success=True, ip="127.0.0.1", request_id="req-1", created_at=datetime(2020, 1, 1)))
        session.add(SecurityEvent(user_id=target.id, rule_code="RESET", severity="low", ip="127.0.0.1", request_id="req-2", created_at=datetime(2020, 1, 1)))
        session.add(AuditLog(request_id="req-3", user_id=target.id, method="DELETE", path=f"/users/{target.id}", status_code=204, duration_ms=10, created_at=datetime(2020, 1, 1)))
        session.add(AccessLog(request_id="req-4", user_id=target.id, method="DELETE", path=f"/users/{target.id}", status_code=204, duration_ms=10, created_at=datetime(2020, 1, 1)))
        session.commit()

        response = client.delete(f"/users/{target.id}")
        assert response.status_code == 204

        assert session.get(User, target.id) is None
        assert session.exec(select(LoginEvent).where(LoginEvent.user_id == target.id)).all() == []
        assert session.exec(select(SecurityEvent).where(SecurityEvent.user_id == target.id)).all() == []
        assert session.exec(select(AuditLog).where(AuditLog.user_id == target.id)).all() == []
        assert session.exec(select(AccessLog).where(AccessLog.user_id == target.id)).all() == []
    finally:
        teardown_client(client)
