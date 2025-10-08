from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field
import sqlalchemy as sa 

#modello tabella prodotti
class Product(SQLModel, table=True):
    __tablename__ = "products"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str 
    description: Optional[str] = None

    product_type: Optional[str] = Field(default="liner", index=True)
    brand: Optional[str] = Field(default=None, index=True)
    model: Optional[str] = Field(default=None, index=True)
    compound: str = Field(default="STD", index=True)     
    only_admin: bool = Field(default=False, index=True)  
    notes: Optional[str] = None       

    manufactured_at: Optional[date] = Field(
        default=None,
        sa_column=sa.Column(sa.Date(), nullable=True)
    )

    spider_wash_cup: Optional[float] = None
    wash_cup: Optional[float] = None
    shell_type: Optional[float] = None

# specifiche tecniche
    liner_length: Optional[float] = None
    shell_orifice: Optional[float] = None
    shell_length: Optional[float] = None
    shell_external_diameter: Optional[float] = None
    barrel_diameter: Optional[float] = None

    mp_depth_mm: Optional[float] = None
    orifice_diameter: Optional[float] = None
    hoodcup_diameter: Optional[float] = None
    return_to_lockring: Optional[float] = None
    lockring_diameter: Optional[float] = None
    overall_length: Optional[float] = None
    milk_tube_id: Optional[float] = None
    barrell_wall_thickness: Optional[float] = None
    barrell_conicity: Optional[float] = None
    hardness: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    #Vincoli e indici
    __table_args__ = (
        sa.UniqueConstraint("brand", "model", "compound", name="ux_products_brand_model_compound"),
        sa.UniqueConstraint("code", name="ux_products_code"),
        sa.Index("ix_products_name", "name"),
        {"sqlite_autoincrement": True},   
    )


class productApplication(SQLModel, table=True):
    __tablename__ = "product_applications"
    
    id: int | None = Field(default=None, primary_key=True)

    product_id: int = Field(sa_column=sa.Column(
            sa.Integer,
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    size_mm: int = Field(index=True)
    label: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)