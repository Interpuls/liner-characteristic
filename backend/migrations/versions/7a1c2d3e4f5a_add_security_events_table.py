"""add security_events table

Revision ID: 7a1c2d3e4f5a
Revises: 95ba20d66b7d
Create Date: 2026-03-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7a1c2d3e4f5a"
down_revision: Union[str, Sequence[str], None] = "95ba20d66b7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "security_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("email_attempted", sa.String(length=320), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("rule_code", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_index("ix_security_events_user_id", "security_events", ["user_id"])
    op.create_index("ix_security_events_email_attempted", "security_events", ["email_attempted"])
    op.create_index("ix_security_events_ip", "security_events", ["ip"])
    op.create_index("ix_security_events_rule_code", "security_events", ["rule_code"])
    op.create_index("ix_security_events_request_id", "security_events", ["request_id"])
    op.create_index("ix_security_events_created_at", "security_events", ["created_at"])
    op.create_index(
        "ix_security_events_rule_created_at",
        "security_events",
        ["rule_code", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_security_events_rule_created_at", table_name="security_events")
    op.drop_index("ix_security_events_created_at", table_name="security_events")
    op.drop_index("ix_security_events_request_id", table_name="security_events")
    op.drop_index("ix_security_events_rule_code", table_name="security_events")
    op.drop_index("ix_security_events_ip", table_name="security_events")
    op.drop_index("ix_security_events_email_attempted", table_name="security_events")
    op.drop_index("ix_security_events_user_id", table_name="security_events")
    op.drop_table("security_events")
