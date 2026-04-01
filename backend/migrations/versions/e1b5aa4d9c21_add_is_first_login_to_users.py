"""add is_first_login to users

Revision ID: e1b5aa4d9c21
Revises: c4b8b6d1a2f0
Create Date: 2026-04-01 16:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1b5aa4d9c21"
down_revision: Union[str, Sequence[str], None] = "c4b8b6d1a2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_first_login", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.execute(sa.text("UPDATE users SET is_first_login = :value").bindparams(value=False))
    op.alter_column("users", "is_first_login", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_first_login")
