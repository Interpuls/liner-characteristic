"""add login_events table

Revision ID: 3c9d1f7a2b4e
Revises: 0a1b2c3d4e5f, f1c2d3e4a5b6
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c9d1f7a2b4e"
down_revision: Union[str, Sequence[str], None] = ("0a1b2c3d4e5f", "f1c2d3e4a5b6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "login_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("email_attempted", sa.String(length=320), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=64), nullable=True),
        sa.Column("region", sa.String(length=128), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_index("ix_login_events_user_id", "login_events", ["user_id"])
    op.create_index("ix_login_events_email_attempted", "login_events", ["email_attempted"])
    op.create_index("ix_login_events_success", "login_events", ["success"])
    op.create_index("ix_login_events_ip", "login_events", ["ip"])
    op.create_index("ix_login_events_request_id", "login_events", ["request_id"])
    op.create_index("ix_login_events_created_at", "login_events", ["created_at"])
    op.create_index(
        "ix_login_events_email_ip_success_created_at",
        "login_events",
        ["email_attempted", "ip", "success", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_login_events_email_ip_success_created_at", table_name="login_events")
    op.drop_index("ix_login_events_created_at", table_name="login_events")
    op.drop_index("ix_login_events_request_id", table_name="login_events")
    op.drop_index("ix_login_events_ip", table_name="login_events")
    op.drop_index("ix_login_events_success", table_name="login_events")
    op.drop_index("ix_login_events_email_attempted", table_name="login_events")
    op.drop_index("ix_login_events_user_id", table_name="login_events")
    op.drop_table("login_events")
