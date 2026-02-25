"""add request_id to access_logs

Revision ID: f1c2d3e4a5b6
Revises: fe0a7f5bf4ab
Create Date: 2026-02-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1c2d3e4a5b6"
down_revision: Union[str, Sequence[str], None] = "fe0a7f5bf4ab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("access_logs", sa.Column("request_id", sa.String(length=64), nullable=True))
    op.create_index("ix_access_logs_request_id", "access_logs", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_access_logs_request_id", table_name="access_logs")
    op.drop_column("access_logs", "request_id")
