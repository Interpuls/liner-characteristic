"""Added column unit system a user

Revision ID: b36818864ab8
Revises: eeb4f8d7a1a1
Create Date: 2025-11-26 16:42:46.652432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b36818864ab8'
down_revision: Union[str, Sequence[str], None] = 'eeb4f8d7a1a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:   
    op.add_column(
        "users",
        sa.Column("unit_system", sa.Enum('metric', 'imperial', name='unitsystem'), nullable=True),
    )
    

def downgrade() -> None:
    op.drop_column("user", "unit_system")
    
    
    
