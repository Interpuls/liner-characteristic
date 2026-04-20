"""populate null unit_system for existing users

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-04-20 09:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE users SET unit_system = 'metric' WHERE unit_system IS NULL"))
    op.alter_column("users", "unit_system", nullable=False, server_default="metric")


def downgrade() -> None:
    op.alter_column("users", "unit_system", nullable=True, server_default=None)
