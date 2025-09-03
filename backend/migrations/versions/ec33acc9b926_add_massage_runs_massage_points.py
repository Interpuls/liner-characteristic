"""add massage_runs & massage_points

Revision ID: ec33acc9b926
Revises: a272d45fb3c6
Create Date: 2025-09-02 10:53:46.945145

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec33acc9b926'
down_revision: Union[str, Sequence[str], None] = 'a272d45fb3c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return name in insp.get_table_names()

def upgrade():
    # massage_runs
    if not _has_table("massage_runs"):
        op.create_table(
            "massage_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("product_application_id", sa.Integer(), nullable=False),
            sa.Column("performed_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["product_application_id"],
                ["product_applications.id"],
                ondelete="CASCADE",
            ),
        )
        op.create_index("ix_massage_runs_pa", "massage_runs", ["product_application_id"])

    # massage_points
    if not _has_table("massage_points"):
        op.create_table(
            "massage_points",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("run_id", sa.Integer(), nullable=False),
            sa.Column("pressure_kpa", sa.Integer(), nullable=False),
            sa.Column("min_val", sa.Float(), nullable=False),
            sa.Column("max_val", sa.Float(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["run_id"], ["massage_runs.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("run_id", "pressure_kpa", name="ux_massage_point_run_pressure"),
        )
        op.create_index("ix_massage_points_run", "massage_points", ["run_id"])
        op.create_index("ix_massage_points_pressure", "massage_points", ["pressure_kpa"])


def downgrade():
    op.drop_index("ix_massage_points_pressure", table_name="massage_points")
    op.drop_index("ix_massage_points_run", table_name="massage_points")
    op.drop_table("massage_points")
    op.drop_index("ix_massage_runs_pa", table_name="massage_runs")
    op.drop_table("massage_runs")
