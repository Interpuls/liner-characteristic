"""add_field_linerlength

Revision ID: 4e91e42d0352
Revises: 6e3607c98efe
Create Date: 2025-09-25 15:27:08.715739

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e91e42d0352'
down_revision: Union[str, Sequence[str], None] = '6e3607c98efe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("liner_length", sa.Float(asdecimal=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("products", "liner_length")
