"""aggiunta campi a prodotto: Only admin, compound, note e data

Revision ID: cd03ad70ca35
Revises: 81e618ee0845
Create Date: 2025-09-22 10:50:28.965737

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import exc as sa_exc


# revision identifiers, used by Alembic.
revision: str = 'cd03ad70ca35'
down_revision: Union[str, Sequence[str], None] = '81e618ee0845'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    insp = sa.inspect(bind)

    # 0) Pulizia: se una run precedente è fallita potrebbe essere rimasta la temp table
    try:
        bind.exec_driver_sql("DROP TABLE IF EXISTS _alembic_tmp_products")
    except Exception:
        pass

    # Helper (only SQLite): drop any unique index on exact columns using PRAGMA
    def drop_unique_index_on_sqlite(cols_exact: list[str]) -> None:
        try:
            rows = bind.exec_driver_sql("PRAGMA index_list('products')").fetchall()
        except Exception:
            rows = []
        for r in rows:
            idx_name = r[1]
            is_unique = int(r[2]) == 1
            if not is_unique:
                continue
            info = bind.exec_driver_sql(f"PRAGMA index_info('{idx_name}')").fetchall()
            names = [c[2] for c in info]
            if names == cols_exact:
                op.execute(f'DROP INDEX IF EXISTS "{idx_name}"')

    # 1) Rimuovi eventuali legacy unique su (brand, model) e su (code) – solo per SQLite
    if dialect == 'sqlite':
        drop_unique_index_on_sqlite(["brand", "model"])
        drop_unique_index_on_sqlite(["code"])

    # In più: rimuovi vincoli/indici legacy in modo sicuro per dialetto
    if dialect == 'postgresql':
        for cname in ("ux_products_brand_model", "uq_products_code", "ux_products_code"):
            try:
                op.execute(f'ALTER TABLE products DROP CONSTRAINT IF EXISTS "{cname}"')
            except Exception:
                pass
        # se esistono indici extra con quegli stessi nomi, prova a dropparli
        for iname in ("ux_products_brand_model", "uq_products_code", "ux_products_code"):
            try:
                op.execute(f'DROP INDEX IF EXISTS "{iname}"')
            except Exception:
                pass
    else:
        for idx_name in ("ux_products_brand_model", "uq_products_code", "ux_products_code"):
            try:
                op.execute(f'DROP INDEX IF EXISTS "{idx_name}"')
            except Exception:
                pass

    # 2) Ricrea la tabella con le nuove colonne e i vincoli desiderati
    if dialect == 'postgresql':
        # A) Postgres: operazioni dirette, senza batch recreate
        existing_cols = {c['name'] for c in insp.get_columns('products')}
        existing_idx = {ix.get('name') for ix in insp.get_indexes('products')}
        existing_uq = {uc.get('name') for uc in insp.get_unique_constraints('products') if uc.get('name')}
        if 'compound' not in existing_cols:
            try:
                op.add_column("products", sa.Column("compound", sa.String(), nullable=False, server_default="STD"))
            except sa_exc.DBAPIError:
                pass
        if 'only_admin' not in existing_cols:
            try:
                op.add_column(
                    "products",
                    sa.Column(
                        "only_admin",
                        sa.Boolean(),
                        nullable=False,
                        server_default=sa.text("false"),
                    ),
                )
            except sa_exc.DBAPIError:
                pass
        if 'notes' not in existing_cols:
            try:
                op.add_column("products", sa.Column("notes", sa.Text(), nullable=True))
            except sa_exc.DBAPIError:
                pass
        if 'manufactured_at' not in existing_cols:
            try:
                op.add_column("products", sa.Column("manufactured_at", sa.Date(), nullable=True))
            except sa_exc.DBAPIError:
                pass

        # vincoli unici idempotenti (solo se mancanti)
        if "ux_products_code" not in existing_uq and "ux_products_code" not in existing_idx:
            op.create_unique_constraint("ux_products_code", "products", ["code"])
        if "ux_products_brand_model_compound" not in existing_uq and "ux_products_brand_model_compound" not in existing_idx:
            op.create_unique_constraint(
                "ux_products_brand_model_compound",
                "products",
                ["brand", "model", "compound"],
            )
    else:
        # B) SQLite: usa batch recreate
        with op.batch_alter_table("products", recreate="always") as batch:
            batch.add_column(sa.Column("compound", sa.String(), nullable=False, server_default="STD"))
            batch.add_column(sa.Column("only_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")))
            batch.add_column(sa.Column("notes", sa.Text(), nullable=True))
            batch.add_column(sa.Column("manufactured_at", sa.Date(), nullable=True))

            batch.create_unique_constraint("ux_products_code", ["code"])
            batch.create_unique_constraint("ux_products_brand_model_compound", ["brand", "model", "compound"])

    # 3) Indici NON unici (creali se non esistono già)
    for name, cols in [
        ("ix_products_compound",   ["compound"]),
        ("ix_products_only_admin", ["only_admin"]),
        ("ix_products_name",       ["name"]),
    ]:
        # crea solo se non esiste già
        if dialect == 'postgresql':
            if name not in existing_idx:
                op.create_index(name, "products", cols, unique=False)
        else:
            try:
                op.create_index(name, "products", cols, unique=False)
            except Exception:
                pass

    # 4) Rimuovi i server_default, lasciamo gestire i default all'app
    # Su Postgres possiamo lasciare i server_default, per evitare alter che potrebbero fallire
    if dialect != 'postgresql':
        try:
            op.alter_column("products", "compound", server_default=None)
        except Exception:
            pass
        try:
            op.alter_column("products", "only_admin", server_default=None)
        except Exception:
            pass
    
    
    # 1) Indice unico parziale: una sola variante pubblica per (brand,model)
    if dialect == 'postgresql':
        # Crea indice unico parziale solo se non esiste
        existing_idx = {ix.get('name') for ix in insp.get_indexes('products')}
        if "ux_public_variant_per_model" not in existing_idx:
            op.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS ux_public_variant_per_model
                ON products(brand, model)
                WHERE only_admin = false
            """)
    else:
        op.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_public_variant_per_model
            ON products(brand, model)
            WHERE only_admin = 0
        """)

    # 2) (Opzionale ma consigliato)
    # Evita record pubblici con brand/model NULL
    if dialect != 'postgresql':
        op.execute("""
            CREATE TABLE IF NOT EXISTS _products_check_tmp AS
            SELECT * FROM products WHERE 1=0
        """)


def downgrade():
    # Torna indietro
    with op.batch_alter_table("products", recreate="always") as batch:
        # ripristina vincolo vecchio
        try:
            batch.drop_constraint("ux_products_brand_model_compound", type_="unique")
        except Exception:
            pass
        batch.create_unique_constraint("ux_products_brand_model", ["brand", "model"])

        # rimuovi colonne nuove
        try:
            batch.drop_index("ix_products_compound")
        except Exception:
            pass
        try:
            batch.drop_index("ix_products_only_admin")
        except Exception:
            pass

        batch.drop_column("compound")
        batch.drop_column("only_admin")
        batch.drop_column("notes")
        batch.drop_column("manufactured_at")
        op.execute("DROP INDEX IF EXISTS ux_public_variant_per_model")

        # gestisci vincoli code/index come preferisci
        # (lasciamo ux_products_code e ix_products_name intatti)
