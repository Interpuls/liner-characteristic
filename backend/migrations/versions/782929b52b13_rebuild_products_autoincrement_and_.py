"""rebuild products (autoincrement) and product_applications (ondelete=cascade)

Revision ID: 782929b52b13
Revises: b61346bab916
Create Date: 2025-09-01 12:10:41.028780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import exc as sa_exc

# revision identifiers, used by Alembic.
revision: str = '782929b52b13'
down_revision: Union[str, Sequence[str], None] = 'b61346bab916'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    def reinspect():
        return sa.inspect(bind)

    insp = reinspect()

    # ---------- PRODUCTS: rebuild senza indici/unique ----------
    if insp.has_table("products_new"):
        op.drop_table("products_new")

    op.create_table(
        "products_new",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("product_type", sa.String(), nullable=True),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column("teat_length", sa.Float(), nullable=True),
        sa.Column("mp_depth_mm", sa.Float(), nullable=True),
        sa.Column("orifice_diameter", sa.Float(), nullable=True),
        sa.Column("hoodcup_diameter", sa.Float(), nullable=True),
        sa.Column("return_to_lockring", sa.Float(), nullable=True),
        sa.Column("lockring_diameter", sa.Float(), nullable=True),
        sa.Column("overall_length", sa.Float(), nullable=True),
        sa.Column("milk_tube_id", sa.Float(), nullable=True),
        sa.Column("barrell_wall_thickness", sa.Float(), nullable=True),
        sa.Column("barrell_conicity", sa.Float(), nullable=True),
        sa.Column("hardness", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sqlite_autoincrement=True,
    )

    insp = reinspect()
    if insp.has_table("products"):
        op.execute("""
            INSERT INTO products_new(
                id, code, name, description, product_type, brand, model,
                teat_length, mp_depth_mm, orifice_diameter, hoodcup_diameter,
                return_to_lockring, lockring_diameter, overall_length, milk_tube_id,
                barrell_wall_thickness, barrell_conicity, hardness, created_at
            )
            SELECT
                id, code, name, description, product_type, brand, model,
                teat_length, mp_depth_mm, orifice_diameter, hoodcup_diameter,
                return_to_lockring, lockring_diameter, overall_length, milk_tube_id,
                barrell_wall_thickness, barrell_conicity, hardness, created_at
            FROM products
        """)
        op.drop_table("products")

    # rename -> poi re-inspect!
    insp = reinspect()
    if insp.has_table("products_new"):
        op.rename_table("products_new", "products")

    # helper per leggere indici senza crash
    def safe_indexes(table):
        try:
            return {ix["name"] for ix in reinspect().get_indexes(table)}
        except sa_exc.NoSuchTableError:
            return set()

    existing_idx = safe_indexes("products")
    if "ix_products_name" not in existing_idx:
        op.create_index("ix_products_name", "products", ["name"], unique=False)
    if "ux_products_code" not in existing_idx:
        op.create_index("ux_products_code", "products", ["code"], unique=True)
    if "ux_products_brand_model" not in existing_idx:
        op.create_index("ux_products_brand_model", "products", ["brand", "model"], unique=True)

    # ---------- PRODUCT_APPLICATIONS: rebuild con ON DELETE CASCADE ----------
    insp = reinspect()
    if insp.has_table("product_applications_new"):
        op.drop_table("product_applications_new")

    op.create_table(
        "product_applications_new",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("size_mm", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
    )

    insp = reinspect()
    if insp.has_table("product_applications"):
        op.execute("""
            INSERT INTO product_applications_new (id, product_id, size_mm, label, created_at)
            SELECT pa.id, pa.product_id, pa.size_mm, pa.label, pa.created_at
            FROM product_applications pa
            WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = pa.product_id)
        """)
        op.drop_table("product_applications")

    # rename -> poi indici
    insp = reinspect()
    if insp.has_table("product_applications_new"):
        op.rename_table("product_applications_new", "product_applications")

    existing_idx = safe_indexes("product_applications")
    if "ux_product_applications_product_size" not in existing_idx:
        op.create_index(
            "ux_product_applications_product_size",
            "product_applications",
            ["product_id", "size_mm"],
            unique=True
        )
    if "ix_product_applications_size_mm" not in existing_idx:
        op.create_index(
            "ix_product_applications_size_mm",
            "product_applications",
            ["size_mm"],
            unique=False
        )
