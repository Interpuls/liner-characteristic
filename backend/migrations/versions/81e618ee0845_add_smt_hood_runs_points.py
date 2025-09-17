"""add smt_hood runs & points

Revision ID: 81e618ee0845
Revises: b0b3a095bed1
Create Date: 2025-09-16 17:29:14.091972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81e618ee0845'
down_revision: Union[str, Sequence[str], None] = 'b0b3a095bed1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "smt_hood_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "product_application_id",
            sa.Integer,
            sa.ForeignKey("product_applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("performed_at", sa.DateTime, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index(
        "ix_smt_hood_runs_product_application_id",
        "smt_hood_runs",
        ["product_application_id"],
        unique=False,
    )

    op.create_table(
        "smt_hood_points",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "run_id",
            sa.Integer,
            sa.ForeignKey("smt_hood_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("flow_code", sa.Integer, nullable=False),  # 5, 19, 36
        sa.Column("flow_lpm", sa.Float, nullable=False),     # 0.5, 1.9, 3.6
        sa.Column("smt_min", sa.Float, nullable=False),
        sa.Column("smt_max", sa.Float, nullable=False),
        sa.Column("hood_min", sa.Float, nullable=False),
        sa.Column("hood_max", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),

        sa.UniqueConstraint("run_id", "flow_code", name="ux_smt_hood_point_run_flow"),
    )
    op.create_index("ix_smt_hood_points_run_id", "smt_hood_points", ["run_id"])
    op.create_index("ix_smt_hood_points_flow_code", "smt_hood_points", ["flow_code"])

def downgrade():
    op.drop_index("ix_smt_hood_points_flow_code", table_name="smt_hood_points")
    op.drop_index("ix_smt_hood_points_run_id", table_name="smt_hood_points")
    op.drop_constraint("ux_smt_hood_point_run_flow", "smt_hood_points", type_="unique")
    op.drop_table("smt_hood_points")

    op.drop_index("ix_smt_hood_runs_product_application_id", table_name="smt_hood_runs")
    op.drop_table("smt_hood_runs")


