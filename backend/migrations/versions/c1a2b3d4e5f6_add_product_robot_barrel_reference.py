"""add product fields: robot_liner, barrel_shape, reference_areas

Revision ID: c1a2b3d4e5f6
Revises: 6e3607c98efe
Create Date: 2025-10-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import JSON
from sqlalchemy import exc as sa_exc


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "4e91e42d0352"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    # robot_liner: boolean default False (dialect-aware)
    cols = {c['name'] for c in insp.get_columns('products')}
    if 'robot_liner' not in cols:
        default_expr = sa.text("false") if dialect == 'postgresql' else sa.text("0")
        try:
            op.add_column(
                "products",
                sa.Column("robot_liner", sa.Boolean(), nullable=False, server_default=default_expr),
            )
        except sa_exc.DBAPIError:
            # If concurrently added by previous attempts, ignore
            pass

    # barrel_shape: string among [round|triangular|squared] (validated at app level)
    cols = {c['name'] for c in insp.get_columns('products')}
    if 'barrel_shape' not in cols:
        try:
            op.add_column(
                "products",
                sa.Column("barrel_shape", sa.String(), nullable=True),
            )
        except sa_exc.DBAPIError:
            pass

    # reference_areas: JSON array of strings or ["Global"]
    cols = {c['name'] for c in insp.get_columns('products')}
    if 'reference_areas' not in cols:
        try:
            op.add_column(
                "products",
                sa.Column("reference_areas", sa.JSON(), nullable=True),
            )
        except sa_exc.DBAPIError:
            pass

    # drop server default to leave handling to the app
    # Avoid on Postgres to keep the default stable during migration
    if dialect != 'postgresql':
        try:
            with op.batch_alter_table("products") as batch:
                batch.alter_column("robot_liner", server_default=None)
        except Exception:
            # ignore if not supported
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
