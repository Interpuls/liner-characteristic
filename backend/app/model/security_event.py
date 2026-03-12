from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class SecurityEvent(SQLModel, table=True):
    __tablename__ = "security_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True, foreign_key="users.id")
    email_attempted: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.String(length=320), nullable=True, index=True),
    )
    ip: Optional[str] = Field(default=None, index=True, max_length=45)
    rule_code: str = Field(sa_column=sa.Column(sa.String(length=64), nullable=False, index=True))
    severity: str = Field(sa_column=sa.Column(sa.String(length=16), nullable=False, default="medium"))
    details_json: Optional[dict] = Field(default=None, sa_column=sa.Column(sa.JSON(), nullable=True))
    request_id: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.String(length=64), nullable=True, index=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        sa.Index("ix_security_events_rule_created_at", "rule_code", "created_at"),
    )
