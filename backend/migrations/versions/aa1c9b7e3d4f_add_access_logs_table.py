"""add access_logs table for API access auditing

Revision ID: aa1c9b7e3d4f
Revises: b36818864ab8
Create Date: 2025-12-10 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aa1c9b7e3d4f"
down_revision: Union[str, Sequence[str], None] = "b36818864ab8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "access_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("country", sa.String(length=64), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_access_logs_user_id", "access_logs", ["user_id"])
    op.create_index("ix_access_logs_ip", "access_logs", ["ip"])
    op.create_index("ix_access_logs_created_at", "access_logs", ["created_at"])
    op.create_index(
        "ix_access_logs_user_path_created_at",
        "access_logs",
        ["user_id", "path", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_access_logs_user_path_created_at", table_name="access_logs")
    op.drop_index("ix_access_logs_created_at", table_name="access_logs")
    op.drop_index("ix_access_logs_ip", table_name="access_logs")
    op.drop_index("ix_access_logs_user_id", table_name="access_logs")
    op.drop_table("access_logs")
