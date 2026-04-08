from sqlalchemy import func
from sqlmodel import Session, select

from app.model.user import User


def normalize_email(value: str) -> str:
    return value.strip().lower()


def find_user_by_email(session: Session, email: str) -> User | None:
    normalized_email = normalize_email(email)
    stmt = select(User).where(func.lower(User.email) == normalized_email)
    return session.exec(stmt).first()
