"""add kpi_scales, test_metrics, kpi_values, tpp_runs

Revision ID: a272d45fb3c6
Revises: 782929b52b13
Create Date: 2025-09-02 08:33:46.850669

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a272d45fb3c6'
down_revision: Union[str, Sequence[str], None] = '782929b52b13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _ensure_index(table, name, cols):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing = {ix["name"] for ix in insp.get_indexes(table)}
    if name not in existing:
        op.create_index(name, table, cols, unique=False)

def upgrade():
    op.create_table(
        "kpi_scales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_code", sa.String(), nullable=False, index=True),
        sa.Column("band_min", sa.Float(), nullable=False),
        sa.Column("band_max", sa.Float(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    _ensure_index("kpi_scales", "ix_kpi_scales_kpi_code", ["kpi_code"])

    op.create_table(
        "test_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_type", sa.String(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("product_application_id", sa.Integer(), nullable=False),
        sa.Column("metric_code", sa.String(), nullable=False),
        sa.Column("value_num", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("context_json", sa.String(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_application_id"], ["product_applications.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("run_type","run_id","metric_code","context_json", name="ux_test_metrics_unique"),
    )

    _ensure_index("test_metrics", "ix_test_metrics_run_type", ["run_type"])
    _ensure_index("test_metrics", "ix_test_metrics_run_id", ["run_id"])
    _ensure_index("test_metrics", "ix_test_metrics_pa", ["product_application_id"])


    op.create_table(
        "kpi_values",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_type", sa.String(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("product_application_id", sa.Integer(), nullable=False),
        sa.Column("kpi_code", sa.String(), nullable=False),
        sa.Column("value_num", sa.Float(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("context_json", sa.String(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_application_id"], ["product_applications.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("run_type","run_id","kpi_code","context_json", name="ux_kpi_values_unique"),
    )
    _ensure_index("kpi_values", "ix_kpi_values_run_type", ["run_type"])
    _ensure_index("kpi_values", "ix_kpi_values_run_id", ["run_id"])
    _ensure_index("kpi_values", "ix_kpi_values_pa", ["product_application_id"])
    _ensure_index("kpi_values", "ix_kpi_values_kpi_code", ["kpi_code"])

    op.create_table(
        "tpp_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_application_id", sa.Integer(), nullable=False),
        sa.Column("performed_at", sa.DateTime(), nullable=True),
        sa.Column("real_tpp", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_application_id"], ["product_applications.id"], ondelete="CASCADE"),
    )
    _ensure_index("tpp_runs", "ix_tpp_runs_pa", ["product_application_id"])

def downgrade():
    op.drop_index("ix_tpp_runs_pa", table_name="tpp_runs")
    op.drop_table("tpp_runs")
    op.drop_index("ix_kpi_values_kpi_code", table_name="kpi_values")
    op.drop_index("ix_kpi_values_pa", table_name="kpi_values")
    op.drop_index("ix_kpi_values_run_id", table_name="kpi_values")
    op.drop_index("ix_kpi_values_run_type", table_name="kpi_values")
    op.drop_table("kpi_values")
    op.drop_index("ix_test_metrics_pa", table_name="test_metrics")
    op.drop_index("ix_test_metrics_run_id", table_name="test_metrics")
    op.drop_index("ix_test_metrics_run_type", table_name="test_metrics")
    op.drop_table("test_metrics")
    op.drop_index("ix_kpi_scales_kpi_code", table_name="kpi_scales")
    op.drop_table("kpi_scales")
