"""add created_at indexes for faster listing

Revision ID: eeb4f8d7a1a1
Revises: cd03ad70ca35, c1a2b3d4e5f6
Create Date: 2025-11-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "eeb4f8d7a1a1"
down_revision: Union[str, Sequence[str], None] = (
    "cd03ad70ca35",
    "c1a2b3d4e5f6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    def has_index(table: str, name: str) -> bool:
        try:
            return any(ix.get("name") == name for ix in insp.get_indexes(table))
        except Exception:
            return False

    def ensure_index(table: str, name: str, columns: list[str], unique: bool = False) -> None:
        if dialect == "sqlite":
            cols = ", ".join(columns)
            uq = "UNIQUE " if unique else ""
            op.execute(f"CREATE {uq}INDEX IF NOT EXISTS \"{name}\" ON {table}({cols})")
        else:
            if not has_index(table, name):
                op.create_index(name, table, columns, unique=unique)

    ensure_index("products", "ix_products_created_at", ["created_at"], unique=False)
    ensure_index("product_applications", "ix_product_applications_created_at", ["created_at"], unique=False)
    ensure_index("tpp_runs", "ix_tpp_runs_created_at", ["created_at"], unique=False)
    ensure_index("massage_runs", "ix_massage_runs_created_at", ["created_at"], unique=False)
    ensure_index("speed_runs", "ix_speed_runs_created_at", ["created_at"], unique=False)
    ensure_index("smt_hood_runs", "ix_smt_hood_runs_created_at", ["created_at"], unique=False)


def downgrade() -> None:
    # Drop indexes safely; use IF EXISTS for SQLite, inspect elsewhere
    bind = op.get_bind()
    dialect = bind.dialect.name

    def drop_idx(table: str, name: str):
        if dialect == "sqlite":
            op.execute(f"DROP INDEX IF EXISTS \"{name}\"")
        else:
            try:
                op.drop_index(name, table_name=table)
            except Exception:
                pass

    drop_idx("smt_hood_runs", "ix_smt_hood_runs_created_at")
    drop_idx("speed_runs", "ix_speed_runs_created_at")
    drop_idx("massage_runs", "ix_massage_runs_created_at")
    drop_idx("tpp_runs", "ix_tpp_runs_created_at")
    drop_idx("product_applications", "ix_product_applications_created_at")
    drop_idx("products", "ix_products_created_at")

