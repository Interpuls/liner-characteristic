"""merge heads

Revision ID: 0a1b2c3d4e5f
Revises: 9f2d3c4b5a6e, b36818864ab8
Create Date: 2026-02-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "0a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = ("9f2d3c4b5a6e", "b36818864ab8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
