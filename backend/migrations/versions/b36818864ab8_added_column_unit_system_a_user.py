"""Added column unit system to user

Revision ID: b36818864ab8
Revises: eeb4f8d7a1a1
Create Date: 2025-11-26 16:42:46.652432
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b36818864ab8"
down_revision: Union[str, Sequence[str], None] = "eeb4f8d7a1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the ENUM once
unit_system_enum = postgresql.ENUM(
    "metric",
    "imperial",
    name="unitsystem"
)


def upgrade() -> None:
    # CREATE enum type if not exists (Postgres only)
    unit_system_enum.create(op.get_bind(), checkfirst=True)

    # ADD column using existing enum
    op.add_column(
        "users",
        sa.Column(
            "unit_system",
            unit_system_enum,
            nullable=True,
        ),
    )


def downgrade() -> None:
    # DROP colonna PRIMA
    op.drop_column("users", "unit_system")

    # DROP enum type DOPO (solo se esiste)
    unit_system_enum.drop(op.get_bind(), checkfirst=True)
