"""add product fields: robot_liner, barrel_shape, reference_areas

Revision ID: c1a2b3d4e5f6
Revises: 6e3607c98efe
Create Date: 2025-10-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import JSON


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "4e91e42d0352"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # robot_liner: boolean default False
    op.add_column(
        "products",
        sa.Column("robot_liner", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    # barrel_shape: string among [round|triangular|squared] (validated at app level)
    op.add_column(
        "products",
        sa.Column("barrel_shape", sa.String(), nullable=True),
    )
    # reference_areas: JSON array of strings or ["Global"]
    op.add_column(
        "products",
        sa.Column("reference_areas", sa.JSON(), nullable=True),
    )

    # drop server default to leave handling to the app
    with op.batch_alter_table("products") as batch:
        try:
            batch.alter_column("robot_liner", server_default=None)
        except Exception:
            # some dialects may not support altering server_default cleanly; ignore
            pass


def downgrade() -> None:
    try:
        op.drop_column("products", "reference_areas")
    except Exception:
        pass
    try:
        op.drop_column("products", "barrel_shape")
    except Exception:
        pass
    try:
        op.drop_column("products", "robot_liner")
    except Exception:
        pass
