"""merge products+kpidef heads

Revision ID: 5a7d8ff03300
Revises: 68ed548da6f0, 4b8cc26eb071
Create Date: 2025-08-28 12:53:42.490677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a7d8ff03300'
down_revision: Union[str, Sequence[str], None] = ('68ed548da6f0', '4b8cc26eb071')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
