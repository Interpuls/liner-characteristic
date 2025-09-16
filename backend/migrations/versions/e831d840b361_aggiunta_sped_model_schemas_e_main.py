"""aggiunta sped model, schemas e main

Revision ID: e831d840b361
Revises: cb03262ea955
Create Date: 2025-09-03 17:12:34.214265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e831d840b361'
down_revision: Union[str, Sequence[str], None] = 'cb03262ea955'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "speed_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "product_application_id",
            sa.Integer,
            sa.ForeignKey("product_applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("performed_at", sa.DateTime, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index(
        "ix_speed_runs_product_application_id",
        "speed_runs",
        ["product_application_id"],
    )

    op.create_table(
        "speed_measures",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "run_id",
            sa.Integer,
            sa.ForeignKey("speed_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sample_no", sa.Integer, nullable=False),
        sa.Column("volume_ml", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        
        sa.UniqueConstraint("run_id", "sample_no", name="ux_speed_measure_run_sample"),
    )
    op.create_index("ix_speed_measures_run_id", "speed_measures", ["run_id"])


def downgrade():
    op.drop_constraint("ux_speed_measure_run_sample", "speed_measures", type_="unique")
    op.drop_index("ix_speed_measures_run_id", table_name="speed_measures")
    op.drop_table("speed_measures")

    op.drop_index("ix_speed_runs_product_application_id", table_name="speed_runs")
    op.drop_table("speed_runs")
