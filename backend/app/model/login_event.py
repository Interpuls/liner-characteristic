from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class LoginEvent(SQLModel, table=True):
    __tablename__ = "login_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True, foreign_key="users.id")
    email_attempted: str = Field(sa_column=sa.Column(sa.String(length=320), nullable=False, index=True))
    success: bool = Field(nullable=False, index=True)
    ip: Optional[str] = Field(default=None, index=True, max_length=45)
    user_agent: Optional[str] = Field(default=None, sa_column=sa.Column(sa.Text(), nullable=True))
    country: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=64), nullable=True))
    region: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=128), nullable=True))
    city: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=128), nullable=True))
    lat: Optional[float] = Field(default=None, nullable=True)
    lon: Optional[float] = Field(default=None, nullable=True)
    request_id: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.String(length=64), nullable=True, index=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        sa.Index(
            "ix_login_events_email_ip_success_created_at",
            "email_attempted",
            "ip",
            "success",
            "created_at",
        ),
    )
