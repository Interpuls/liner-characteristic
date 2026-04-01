"""merge security_events and first_login heads

Revision ID: f2c6d8e0b1a3
Revises: a7b8c9d0e1f2, e1b5aa4d9c21
Create Date: 2026-04-01 17:32:00.000000
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "f2c6d8e0b1a3"
down_revision: Union[str, Sequence[str], None] = ("a7b8c9d0e1f2", "e1b5aa4d9c21")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
