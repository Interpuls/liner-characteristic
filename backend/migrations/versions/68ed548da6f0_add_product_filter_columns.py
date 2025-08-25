"""add product filter columns

Revision ID: 68ed548da6f0
Revises: fbe748a7a2cf
Create Date: 2025-08-25 15:49:45.758540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '68ed548da6f0'
down_revision: Union[str, Sequence[str], None] = 'fbe748a7a2cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_col_if_missing(table, column):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return
    cols = {c['name'] for c in insp.get_columns(table)}
    if column.name not in cols:
        op.add_column(table, column)


def upgrade():
    _add_col_if_missing("products", sa.Column("product_type", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("brand", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("model", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("teat_size", sa.String(), nullable=True))


def downgrade():
    # opzionale: rimozione colonne (di solito in prod non si fa)
    try:
        op.drop_column("products", "teat_size")
    except Exception:
        pass
    try:
        op.drop_column("products", "model")
    except Exception:
        pass
    try:
        op.drop_column("products", "brand")
    except Exception:
        pass
    try:
        op.drop_column("products", "product_type")
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
