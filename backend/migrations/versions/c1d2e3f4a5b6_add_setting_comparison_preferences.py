"""add setting comparison preferences

Revision ID: c1d2e3f4a5b6
Revises: f2c6d8e0b1a3
Create Date: 2026-04-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "f2c6d8e0b1a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "setting_comparison_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_setting_comparison_pref_name"),
    )
    op.create_index(
        op.f("ix_setting_comparison_preferences_user_id"),
        "setting_comparison_preferences",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_setting_comparison_preferences_name"),
        "setting_comparison_preferences",
        ["name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_setting_comparison_preferences_name"), table_name="setting_comparison_preferences")
    op.drop_index(op.f("ix_setting_comparison_preferences_user_id"), table_name="setting_comparison_preferences")
    op.drop_table("setting_comparison_preferences")

