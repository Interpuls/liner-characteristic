"""add news table

Revision ID: 9f2d3c4b5a6e
Revises: eeb4f8d7a1a1
Create Date: 2026-02-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f2d3c4b5a6e"
down_revision: Union[str, Sequence[str], None] = "eeb4f8d7a1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    if not insp.has_table("news"):
        op.create_table(
            "news",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("image_url", sa.String(), nullable=True),
            sa.Column("created_by", sa.String(), nullable=True),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("published_at", sa.DateTime(), nullable=True),
        )

    def ensure_index(table: str, name: str, columns: list[str], unique: bool = False) -> None:
        if dialect == "sqlite":
            cols = ", ".join(columns)
            uq = "UNIQUE " if unique else ""
            op.execute(f"CREATE {uq}INDEX IF NOT EXISTS \"{name}\" ON {table}({cols})")
        else:
            existing = {ix["name"] for ix in insp.get_indexes(table)} if insp.has_table(table) else set()
            if name not in existing:
                op.create_index(name, table, columns, unique=unique)

    ensure_index("news", "ix_news_title", ["title"], unique=False)
    ensure_index("news", "ix_news_created_by", ["created_by"], unique=False)
    ensure_index("news", "ix_news_is_published", ["is_published"], unique=False)
    ensure_index("news", "ix_news_published_at", ["published_at"], unique=False)


def downgrade() -> None:
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

    drop_idx("news", "ix_news_published_at")
    drop_idx("news", "ix_news_is_published")
    drop_idx("news", "ix_news_created_by")
    drop_idx("news", "ix_news_title")
    if dialect == "sqlite":
        op.execute("DROP TABLE IF EXISTS news")
    else:
        op.drop_table("news")
