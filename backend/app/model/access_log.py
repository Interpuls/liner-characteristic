from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlmodel import SQLModel, Field


class AccessLog(SQLModel, table=True):
    __tablename__ = "access_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True, foreign_key="users.id")
    method: str = Field(sa_column=sa.Column(sa.String(length=10), nullable=False))
    path: str = Field(sa_column=sa.Column(sa.Text(), nullable=False))
    status_code: int = Field(nullable=False)
    ip: Optional[str] = Field(default=None, index=True, max_length=45)
    country: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=64)))
    city: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=128)))
    user_agent: Optional[str] = Field(default=None, sa_column=sa.Column(sa.Text()))
    duration_ms: int = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        sa.Index("ix_access_logs_user_path_created_at", "user_id", "path", "created_at"),
    )
