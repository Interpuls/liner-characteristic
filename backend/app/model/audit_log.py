from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlmodel import SQLModel, Field


class AuditLog(SQLModel, table=True):
    """Audit trail for state-changing operations (POST/PUT/PATCH/DELETE)."""

    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)

    request_id: str = Field(sa_column=sa.Column(sa.String(length=64), nullable=False, index=True))
    user_id: Optional[int] = Field(default=None, index=True, foreign_key="users.id")

    method: str = Field(sa_column=sa.Column(sa.String(length=10), nullable=False))
    path: str = Field(sa_column=sa.Column(sa.Text(), nullable=False))
    status_code: int = Field(nullable=False)

    ip: Optional[str] = Field(default=None, index=True, max_length=45)
    user_agent: Optional[str] = Field(default=None, sa_column=sa.Column(sa.Text()))

    # Redacted, size-limited JSON snapshot of request payload when available
    request_json: Optional[dict] = Field(default=None, sa_column=sa.Column(sa.JSON(), nullable=True))

    duration_ms: int = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        sa.Index("ix_audit_logs_user_method_path_created_at", "user_id", "method", "path", "created_at"),
    )
