"""merge login heads

Revision ID: 95ba20d66b7d
Revises: 3c9d1f7a2b4e, f9d8e7c6b5a4
Create Date: 2026-03-12 14:11:19.199649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95ba20d66b7d'
down_revision: Union[str, Sequence[str], None] = ('3c9d1f7a2b4e', 'f9d8e7c6b5a4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
