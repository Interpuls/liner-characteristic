from __future__ import annotations

from typing import Optional
from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field, UniqueConstraint, Index, Relationship
from sqlalchemy import UniqueConstraint, Index, Column, JSON
from sqlalchemy.dialects.postgresql import JSONB


# --------------- USER MODELS ----------------------------------

class UserRole(str, Enum):
    admin = "admin"
    user = "user"

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.user)
    is_active: bool = Field(default=True)  
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_role", "role"),
    )


# --------------- PRODUCT MODELS -------------------------------

class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    # nuovi campi per filtri base
    product_type: Optional[str] = Field(default="liner", index=True)
    brand: Optional[str] = Field(default=None, index=True)
    model: Optional[str] = Field(default=None, index=True)
    teat_size: Optional[str] = Field(default=None, index=True)
    # specifiche tecniche
    teat_length: Optional[float] = None
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
    __table_args__ = (
        UniqueConstraint("code", name="uq_products_code"),
        Index("ix_products_name", "name"),
    )



# --------------- SEARCH MODELS ---------------------

class SearchPreference(SQLModel, table=True):
    __tablename__ = "search_preferences"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="users.id")
    name: str = Field(index=True)  # nome del preset
    # JSON di filtri: { product_type, brand, model, teat_size, kpi: [...], ... }
    filters: dict = Field(sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_user_pref_name"),)


# --------------- TEST TYPE MODELS ----------------------------------

class TestType(SQLModel, table=True):
    __tablename__ = "test_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str 
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("code", name="uq_test_types_code"),
        Index("ix_test_types_name", "name"),
    )



# --------------- KPI MODELS --------------------------

class FormulaType(str, Enum):
    SQL = "SQL"
    PY  = "PY"
    AGG = "AGG"


class KpiDef(SQLModel, table=True):
    __tablename__ = "kpi_def"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)                
    name: str                                   
    description: Optional[str] = None

    test_type_id: int = Field(foreign_key="test_types.id", index=True)

    formula_type: FormulaType
    formula_text: str                            # testo SQL o Python o definizione aggregazione

    
    inputs: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False)) 
    weight: float = 1.0

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("code", name="uq_kpi_def_code"),
        Index("ix_kpi_def_name", "name"),
    )