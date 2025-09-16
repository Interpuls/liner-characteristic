"""add speed_runs single-value

Revision ID: b0b3a095bed1
Revises: cb03262ea955
Create Date: 2025-09-16 11:55:40.617296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import sqlmodel as sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b0b3a095bed1'
down_revision: Union[str, Sequence[str], None] = 'cb03262ea955'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "speed_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_application_id", sa.Integer(), sa.ForeignKey("product_applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("performed_at", sa.DateTime(), nullable=True),
        sa.Column("measure_ml", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_speed_runs_product_application_id", "speed_runs", ["product_application_id"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_speed_runs_product_application_id", table_name="speed_runs")
    op.drop_table("speed_runs")
