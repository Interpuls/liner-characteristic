"""add unique constraint on products(brand,model)

Revision ID: 82b941fefff6
Revises: 5a7d8ff03300
Create Date: 2025-08-29 10:23:53.887118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82b941fefff6'
down_revision: Union[str, Sequence[str], None] = '5a7d8ff03300'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_index(
        "ux_products_brand_model",
        "products",
        ["brand", "model"],
        unique=True
    )

def downgrade():
    op.drop_index("ux_products_brand_model", table_name="products")
