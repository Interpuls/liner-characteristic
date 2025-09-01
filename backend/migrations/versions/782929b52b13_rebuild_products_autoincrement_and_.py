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
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    if dialect == "postgresql":
        # --- POSTGRES: niente rebuild, solo FK CASCADE + indici ---
        # 1) Drop la FK esistente (qualunque nome abbia)
        fks = insp.get_foreign_keys("product_applications")
        for fk in fks:
            if fk.get("referred_table") == "products" and fk.get("constrained_columns") == ["product_id"]:
                op.drop_constraint(
                    fk["name"], "product_applications", type_="foreignkey"
                )
                break

        # 2) Crea la nuova FK con ON DELETE CASCADE
        op.create_foreign_key(
            "product_applications_product_id_fkey",
            source="product_applications",
            referent="products",
            local_cols=["product_id"],
            remote_cols=["id"],
            ondelete="CASCADE",
        )

        # 3) Indici/unique (creali solo se mancanti)
        def idx_names(table):
            try:
                return {ix["name"] for ix in sa.inspect(bind).get_indexes(table)}
            except sa_exc.NoSuchTableError:
                return set()

        # products: unique su code, unique su (brand,model), index su name
        pidx = idx_names("products")
        if "ix_products_name" not in pidx:
            op.create_index("ix_products_name", "products", ["name"], unique=False)
        if "ux_products_code" not in pidx:
            op.create_index("ux_products_code", "products", ["code"], unique=True)
        if "ux_products_brand_model" not in pidx:
            op.create_index("ux_products_brand_model", "products", ["brand", "model"], unique=True)

        # product_applications: unique su (product_id,size_mm), index su size_mm
        paidx = idx_names("product_applications")
        if "ux_product_applications_product_size" not in paidx:
            op.create_index(
                "ux_product_applications_product_size",
                "product_applications",
                ["product_id", "size_mm"],
                unique=True,
            )
        if "ix_product_applications_size_mm" not in paidx:
            op.create_index(
                "ix_product_applications_size_mm",
                "product_applications",
                ["size_mm"],
                unique=False,
            )
        return  # fine percorso Postgres

    # --------- SQLITE: percorso “copy & rename” (come in dev) ---------
    def reinspect():
        return sa.inspect(bind)

    # PRODUCTS rebuild senza indici/unique finché non droppiamo la vecchia
    if reinspect().has_table("products_new"):
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

    if reinspect().has_table("products"):
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

    if reinspect().has_table("products_new"):
        op.rename_table("products_new", "products")

    # indici/unique dopo il rename
    def safe_indexes(table):
        try:
            return {ix["name"] for ix in reinspect().get_indexes(table)}
        except sa_exc.NoSuchTableError:
            return set()

    pidx = safe_indexes("products")
    if "ix_products_name" not in pidx:
        op.create_index("ix_products_name", "products", ["name"], unique=False)
    if "ux_products_code" not in pidx:
        op.create_index("ux_products_code", "products", ["code"], unique=True)
    if "ux_products_brand_model" not in pidx:
        op.create_index("ux_products_brand_model", "products", ["brand", "model"], unique=True)

    # PRODUCT_APPLICATIONS rebuild con FK CASCADE
    if reinspect().has_table("product_applications_new"):
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

    if reinspect().has_table("product_applications"):
        op.execute("""
            INSERT INTO product_applications_new (id, product_id, size_mm, label, created_at)
            SELECT pa.id, pa.product_id, pa.size_mm, pa.label, pa.created_at
            FROM product_applications pa
            WHERE EXISTS (SELECT 1 FROM products p WHERE p.id = pa.product_id)
        """)
        op.drop_table("product_applications")

    if reinspect().has_table("product_applications_new"):
        op.rename_table("product_applications_new", "product_applications")

    paidx = safe_indexes("product_applications")
    if "ux_product_applications_product_size" not in paidx:
        op.create_index(
            "ux_product_applications_product_size",
            "product_applications",
            ["product_id", "size_mm"],
            unique=True
        )
    if "ix_product_applications_size_mm" not in paidx:
        op.create_index(
            "ix_product_applications_size_mm",
            "product_applications",
            ["size_mm"],
            unique=False
        )
