"""merge heads after request_id

Revision ID: f9d8e7c6b5a4
Revises: 0a1b2c3d4e5f, f1c2d3e4a5b6
Create Date: 2026-03-04 00:00:00.000000
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "f9d8e7c6b5a4"
down_revision: Union[str, Sequence[str], None] = ("0a1b2c3d4e5f", "f1c2d3e4a5b6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
