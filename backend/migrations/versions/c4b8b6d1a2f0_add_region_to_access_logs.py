"""add region to access_logs

Revision ID: c4b8b6d1a2f0
Revises: aa1c9b7e3d4f
Create Date: 2026-03-31 14:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4b8b6d1a2f0"
down_revision: Union[str, Sequence[str], None] = "aa1c9b7e3d4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("access_logs", sa.Column("region", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("access_logs", "region")
