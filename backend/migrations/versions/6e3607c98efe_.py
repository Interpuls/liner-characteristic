"""empty message

Revision ID: 6e3607c98efe
Revises: cd03ad70ca35
Create Date: 2025-09-23 14:17:34.682611

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e3607c98efe'
down_revision: Union[str, Sequence[str], None] = 'cd03ad70ca35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("shell_type", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("shell_orifice", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("shell_length", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("shell_external_diameter", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("wash_cup", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("spider_wash_cup", sa.Float(asdecimal=False), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("barrel_diameter", sa.Float(asdecimal=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("products", "shell_type")
    op.drop_column("products", "barrel_diameter")
    op.drop_column("products", "spider_wash_cup")
    op.drop_column("products", "wash_cup")
    op.drop_column("products", "shell_external_diameter")
    op.drop_column("products", "shell_length")
    op.drop_column("products", "shell_orifice")