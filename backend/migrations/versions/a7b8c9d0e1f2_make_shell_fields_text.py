"""make shell/wash fields textual

Revision ID: a7b8c9d0e1f2
Revises: f9d8e7c6b5a4
Create Date: 2026-03-12 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f9d8e7c6b5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("ALTER TABLE products ALTER COLUMN shell_type TYPE VARCHAR USING shell_type::text")
        op.execute("ALTER TABLE products ALTER COLUMN wash_cup TYPE VARCHAR USING wash_cup::text")
        op.execute("ALTER TABLE products ALTER COLUMN spider_wash_cup TYPE VARCHAR USING spider_wash_cup::text")
        return

    with op.batch_alter_table("products") as batch:
        batch.alter_column("shell_type", type_=sa.String(), existing_type=sa.Float(), existing_nullable=True)
        batch.alter_column("wash_cup", type_=sa.String(), existing_type=sa.Float(), existing_nullable=True)
        batch.alter_column("spider_wash_cup", type_=sa.String(), existing_type=sa.Float(), existing_nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute(
            """
            ALTER TABLE products
            ALTER COLUMN shell_type TYPE DOUBLE PRECISION
            USING CASE
              WHEN shell_type IS NULL OR btrim(shell_type) = '' THEN NULL
              WHEN shell_type ~ '^[+-]?([0-9]*[.])?[0-9]+$' THEN shell_type::double precision
              ELSE NULL
            END
            """
        )
        op.execute(
            """
            ALTER TABLE products
            ALTER COLUMN wash_cup TYPE DOUBLE PRECISION
            USING CASE
              WHEN wash_cup IS NULL OR btrim(wash_cup) = '' THEN NULL
              WHEN wash_cup ~ '^[+-]?([0-9]*[.])?[0-9]+$' THEN wash_cup::double precision
              ELSE NULL
            END
            """
        )
        op.execute(
            """
            ALTER TABLE products
            ALTER COLUMN spider_wash_cup TYPE DOUBLE PRECISION
            USING CASE
              WHEN spider_wash_cup IS NULL OR btrim(spider_wash_cup) = '' THEN NULL
              WHEN spider_wash_cup ~ '^[+-]?([0-9]*[.])?[0-9]+$' THEN spider_wash_cup::double precision
              ELSE NULL
            END
            """
        )
        return

    with op.batch_alter_table("products") as batch:
        batch.alter_column("shell_type", type_=sa.Float(), existing_type=sa.String(), existing_nullable=True)
        batch.alter_column("wash_cup", type_=sa.Float(), existing_type=sa.String(), existing_nullable=True)
        batch.alter_column("spider_wash_cup", type_=sa.Float(), existing_type=sa.String(), existing_nullable=True)
