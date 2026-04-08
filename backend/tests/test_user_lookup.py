from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

from app.model.user import User
from app.services.user_lookup import find_user_by_email, normalize_email


def build_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def test_normalize_email_trims_and_lowercases():
    assert normalize_email("  NatLog@Milkrite-Interpuls.com  ") == "natlog@milkrite-interpuls.com"


def test_find_user_by_email_matches_legacy_mixed_case_email():
    engine = build_engine()
    SQLModel.metadata.create_all(engine, tables=[User.__table__])

    with Session(engine) as session:
        session.add(
            User(
                email="NatLog@Milkrite-Interpuls.com",
                hashed_password="fake-hash",
            )
        )
        session.commit()

        found = find_user_by_email(session, "natlog@milkrite-interpuls.com")
        assert found is not None
        assert found.email == "NatLog@Milkrite-Interpuls.com"
