"""create product_applications (size_mm,label) unique per product

Revision ID: b61346bab916
Revises: 82b941fefff6
Create Date: 2025-09-01 09:22:41.334645

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b61346bab916'
down_revision: Union[str, Sequence[str], None] = '82b941fefff6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1) crea tabella solo se non esiste
    if not insp.has_table("product_applications"):
        op.create_table(
            "product_applications",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("size_mm", sa.Integer(), nullable=False),
            sa.Column("label", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        )

    # 2) crea indici solo se mancanti
    existing_idx = {ix["name"] for ix in insp.get_indexes("product_applications")} if insp.has_table("product_applications") else set()

    if "ux_product_applications_product_size" not in existing_idx:
        op.create_index(
            "ux_product_applications_product_size",
            "product_applications",
            ["product_id", "size_mm"],
            unique=True,
        )

    if "ix_product_applications_size_mm" not in existing_idx:
        op.create_index(
            "ix_product_applications_size_mm",
            "product_applications",
            ["size_mm"],
            unique=False,
        )

def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("product_applications"):
        existing_idx = {ix["name"] for ix in insp.get_indexes("product_applications")}
        if "ix_product_applications_size_mm" in existing_idx:
            op.drop_index("ix_product_applications_size_mm", table_name="product_applications")
        if "ux_product_applications_product_size" in existing_idx:
            op.drop_index("ux_product_applications_product_size", table_name="product_applications")
        # Attenzione: se la tabella è stata creata in passato da runtime,
        # il downgrade la droppa comunque (ok per dev). In prod valuta.
        op.drop_table("product_applications")