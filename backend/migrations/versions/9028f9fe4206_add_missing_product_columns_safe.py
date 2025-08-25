from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import sqlmodel

# revision identifiers, used by Alembic.
revision = "add_product_columns_safe"
down_revision = "68ed548da6f0"  
branch_labels = None
depends_on = None

def _add_col_if_missing(table: str, column: sa.Column):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return
    existing = {c["name"] for c in insp.get_columns(table)}
    if column.name not in existing:
        op.add_column(table, column)

def upgrade():
    _add_col_if_missing("products", sa.Column("product_type", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("brand", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("model", sa.String(), nullable=True))
    _add_col_if_missing("products", sa.Column("teat_size", sa.String(), nullable=True))

    # se hai già aggiunto anche gli altri campi dimensionali nel model ma non in prod, attivali qui:
    _add_col_if_missing("products", sa.Column("teat_length", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("mp_depth_mm", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("orifice_diameter", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("hoodcup_diameter", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("return_to_lockring", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("lockring_diameter", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("overall_length", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("milk_tube_id", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("barrell_wall_thickness", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("barrell_conicity", sa.Float(), nullable=True))
    _add_col_if_missing("products", sa.Column("hardness", sa.Float(), nullable=True))

def downgrade():
    # opzionale: di solito non si rimuovono colonne in prod
    pass
