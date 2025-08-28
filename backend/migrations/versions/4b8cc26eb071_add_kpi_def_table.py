"""add kpi_def table

Revision ID: 4b8cc26eb071
Revises: 9c95df162f83
Create Date: 2025-08-25 15:17:22.827115

"""
from typing import Sequence, Union

from alembic import op
import sqlmodel
import sqlalchemy as sa

from sqlalchemy.dialects import postgresql
from sqlalchemy import Text


# revision identifiers, used by Alembic.
revision: str = '4b8cc26eb071'
down_revision: Union[str, Sequence[str], None] = '9c95df162f83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    inspect = sa.inspect(bind)
    # Enum per formula_type
    if bind.dialect.name == "postgresql":
        formula_enum = postgresql.ENUM('SQL','PY','AGG', name='formula_type_enum', create_type=True)
    else:
        formula_enum = sa.Enum('SQL','PY','AGG', name='formula_type_enum')

    if bind.dialect.name == "postgresql":
        inputs_type = postgresql.JSONB(astext_type=sa.Text())
    else:
        inputs_type = sa.JSON()
  
    # Controllo prima che non esista già la tabella
    if 'kpi_def' not in inspect.get_table_names():
        op.create_table(
            'kpi_def',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('code', sa.String(), nullable=False, index=True),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('test_type_id', sa.Integer(), nullable=False, index=True),
            sa.Column('formula_type', formula_enum, nullable=False),
            sa.Column('formula_text', sa.Text(), nullable=False),
            sa.Column('inputs', inputs_type, nullable=False),
            sa.Column('weight', sa.Float(), nullable=False, server_default=sa.text("1.0")),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['test_type_id'], ['test_types.id']),
            sa.UniqueConstraint('code', name='uq_kpi_def_code'),
    )

    # indici extra
    op.create_index('ix_kpi_def_code', 'kpi_def', ['code'], unique=False, if_not_exists=True)
    op.create_index('ix_kpi_def_test_type_id', 'kpi_def', ['test_type_id'], unique=False, if_not_exists=True)


def downgrade():
    bind = op.get_bind()
    op.drop_index('ix_kpi_def_test_type_id', table_name='kpi_def')
    op.drop_index('ix_kpi_def_code', table_name='kpi_def')
    op.drop_table('kpi_def')

    # su Postgres, rimuovi il tipo enum se creato
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS formula_type_enum")
