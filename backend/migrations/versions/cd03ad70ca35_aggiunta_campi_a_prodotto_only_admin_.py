"""aggiunta campi a prodotto: Only admin, compound, note e data

Revision ID: cd03ad70ca35
Revises: 81e618ee0845
Create Date: 2025-09-22 10:50:28.965737

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd03ad70ca35'
down_revision: Union[str, Sequence[str], None] = '81e618ee0845'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()

    # 0) Pulizia: se una run precedente è fallita potrebbe essere rimasta la temp table
    try:
        bind.exec_driver_sql("DROP TABLE IF EXISTS _alembic_tmp_products")
    except Exception:
        pass

    # Helper: droppa qualsiasi indice UNICO sulle colonne esatte (ordine esatto)
    def drop_unique_index_on(cols_exact: list[str]) -> None:
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
            names = [c[2] for c in info]  # [(seqno,cid,name), ...]
            if names == cols_exact:
                op.execute(f'DROP INDEX IF EXISTS "{idx_name}"')

    # 1) Rimuovi eventuali legacy unique su (brand, model) e su (code)
    drop_unique_index_on(["brand", "model"])
    drop_unique_index_on(["code"])

    # In più: prova a droppare per nome noto (idempotente, harmless)
    for idx_name in ("ux_products_brand_model", "uq_products_code", "ux_products_code"):
        try:
            op.execute(f'DROP INDEX IF EXISTS "{idx_name}"')
        except Exception:
            pass

    # 2) Ricrea la tabella con le nuove colonne e i vincoli desiderati
    with op.batch_alter_table("products", recreate="always") as batch:
        # nuove colonne
        batch.add_column(sa.Column("compound", sa.String(), nullable=False, server_default="STD"))
        batch.add_column(sa.Column("only_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")))
        batch.add_column(sa.Column("notes", sa.Text(), nullable=True))
        batch.add_column(sa.Column("manufactured_at", sa.Date(), nullable=True))

        # vincoli unici desiderati
        batch.create_unique_constraint("ux_products_code", ["code"])
        batch.create_unique_constraint("ux_products_brand_model_compound", ["brand", "model", "compound"])

    # 3) Indici NON unici (creali se non esistono già)
    for name, cols in [
        ("ix_products_compound",   ["compound"]),
        ("ix_products_only_admin", ["only_admin"]),
        ("ix_products_name",       ["name"]),
    ]:
        try:
            op.create_index(name, "products", cols, unique=False)
        except Exception:
            pass

    # 4) Rimuovi i server_default, lasciamo gestire i default all'app
    with op.batch_alter_table("products") as batch:
        batch.alter_column("compound", server_default=None)
        batch.alter_column("only_admin", server_default=None)
    
    
    # 1) Indice unico parziale: una sola variante pubblica per (brand,model)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_public_variant_per_model
        ON products(brand, model)
        WHERE only_admin = 0
    """)

    # 2) (Opzionale ma consigliato)
    # Evita record pubblici con brand/model NULL
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
