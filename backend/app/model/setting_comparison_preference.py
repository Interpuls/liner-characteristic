from datetime import datetime, timezone
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column, JSON
import sqlalchemy as sa


def utcnow():
    return datetime.now(timezone.utc)


class SettingComparisonPreference(SQLModel, table=True):
    __tablename__ = "setting_comparison_preferences"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=sa.Column(
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        )
    )
    name: str = Field(index=True)
    payload: Dict[str, Any] = Field(sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("user_id", "name", name="uq_user_setting_comparison_pref_name"),
    )

