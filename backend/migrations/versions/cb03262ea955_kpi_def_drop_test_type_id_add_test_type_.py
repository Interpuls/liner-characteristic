"""kpi_def: drop test_type_id add test_type_code

Revision ID: cb03262ea955
Revises: f506ad720b7e
Create Date: 2025-09-02 12:25:41.357441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb03262ea955'
down_revision: Union[str, Sequence[str], None] = 'f506ad720b7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    # 1) add nuova colonna (nullable per il backfill)
    with op.batch_alter_table("kpi_def") as batch_op:
        batch_op.add_column(sa.Column("test_type_code", sa.String(), nullable=True))
        batch_op.create_index("ix_kpi_def_test_type_code", ["test_type_code"])

    # 2) backfill naive: se esisteva test_types prova a mappare,
    #    altrimenti assegna un default provvisorio "TPP" (che potrai cambiare via API)
    try:
        # backfill via join (Postgres) — per SQLite posso fare fallback sotto
        if dialect != "sqlite":
            op.execute("""
                UPDATE kpi_def kd
                SET test_type_code = tt.code
                FROM test_types tt
                WHERE kd.test_type_id = tt.id
            """)
        else:
            # SQLite non fa UPDATE..FROM: fallback (set default TPP)
            op.execute("UPDATE kpi_def SET test_type_code = 'TPP' WHERE test_type_code IS NULL")
    except Exception:
        # se non esiste test_types, assegna default
        op.execute("UPDATE kpi_def SET test_type_code = 'TPP' WHERE test_type_code IS NULL")

    # 3) rendi NOT NULL la nuova colonna
    with op.batch_alter_table("kpi_def") as batch_op:
        batch_op.alter_column("test_type_code", existing_type=sa.String(), nullable=False)

    # 4) rimuovi FK e colonna vecchia
    #    nomi constraint possono differire: usiamo batch_alter_table che gestisce in SQLite
    try:
        with op.batch_alter_table("kpi_def") as batch_op:
            # se conosci il nome esatto FK, puoi dropparlo esplicitamente.
            # batch_op.drop_constraint("kpi_def_test_type_id_fkey", type_="foreignkey")
            batch_op.drop_column("test_type_id")
    except Exception:
        # se non esiste la colonna (già rimossa), ignora
        pass

def downgrade():
    # al downgrade reintroduci test_type_id (nullable), ripopola da codice (impossibile senza tabella test_types),
    # poi togli test_type_code. Qui metti una versione minimale.
    with op.batch_alter_table("kpi_def") as batch_op:
        batch_op.add_column(sa.Column("test_type_id", sa.Integer(), nullable=True))
    # opzionale: ricreare FK se la tabella test_types esiste
    # with op.batch_alter_table("kpi_def") as batch_op:
    #     batch_op.create_foreign_key("kpi_def_test_type_id_fkey", "test_types", ["test_type_id"], ["id"])
    with op.batch_alter_table("kpi_def") as batch_op:
        batch_op.drop_index("ix_kpi_def_test_type_code")
        batch_op.drop_column("test_type_code")
