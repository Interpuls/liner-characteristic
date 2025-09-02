"""uniq kpi_scales per (kpi_code, band_min, band_max)

Revision ID: f506ad720b7e
Revises: ec33acc9b926
Create Date: 2025-09-02 11:16:04.251226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f506ad720b7e'
down_revision: Union[str, Sequence[str], None] = 'ec33acc9b926'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # SQLite necessita batch_alter_table; va bene anche su Postgres
    with op.batch_alter_table("kpi_scales") as batch_op:
        batch_op.create_unique_constraint(
            "uq_kpi_scales_code_minmax",
            ["kpi_code", "band_min", "band_max"]
        )

def downgrade():
    with op.batch_alter_table("kpi_scales") as batch_op:
        batch_op.drop_constraint("uq_kpi_scales_code_minmax", type_="unique")