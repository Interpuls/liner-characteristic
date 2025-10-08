from __future__ import annotations

from typing import Optional
from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field, UniqueConstraint, Index, Relationship
from sqlalchemy import UniqueConstraint, Index, Column, JSON
import sqlalchemy as sa 
from sqlalchemy.dialects.postgresql import JSONB


# --------------- USER MODELS ----------------------------------

"""class UserRole(str, Enum):
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
"""
# --------------- PRODUCT MODELS -------------------------------

"""class Product(SQLModel, table=True):
    __tablename__ = "products"
    __table_args__ = (
        sa.UniqueConstraint("brand", "model", "compound", name="ux_products_brand_model_compound"),
        sa.UniqueConstraint("code", name="ux_products_code"),
        sa.Index("ix_products_name", "name"),
        {"sqlite_autoincrement": True},   
    )
    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    
    product_type: Optional[str] = Field(default="liner", index=True)
    brand: Optional[str] = Field(default=None, index=True)
    model: Optional[str] = Field(default=None, index=True)
    compound: str = Field(default="STD", index=True)     
    only_admin: bool = Field(default=False, index=True)  
    notes: Optional[str] = None                          
    manufactured_at: date | None = Field(
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

    # nuovi campi richiesti
    robot_liner: bool = Field(default=False)
    # "round" | "triangular" | "squared" (salvato come stringa)
    barrel_shape: Optional[str] = Field(default=None)
    # lista di aree di riferimento oppure ["Global"]. Persistito come JSON
    reference_areas: list[str] | None = Field(default=None, sa_column=Column(JSON, nullable=True))



class ProductApplication(SQLModel, table=True):
    __tablename__ = "product_applications"
    id: int | None = Field(default=None, primary_key=True)
    # FK con cascade (verrà applicata in migration)
    product_id: int = Field(
        sa_column=sa.Column(
            sa.Integer,
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    size_mm: int = Field(index=True)
    label: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)"""


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


class TestKind(str, Enum):
    TPP = "TPP"
    MASSAGE = "MASSAGE"
    SPEED = "SPEED"
    SMT_HOOD = "SMT_HOOD"

class KpiDef(SQLModel, table=True):
    __tablename__ = "kpi_def"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)                 # es. "CLOSURE"
    name: str
    description: Optional[str] = None

    # PRIMA c'era: test_type_id: int = Field(foreign_key="test_types.id", index=True)
    test_type_code: TestKind = Field(index=True)  # "TPP" | "MASSAGE" | "SPEED" | "SMT"

    formula_type: FormulaType
    formula_text: str
    inputs: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    weight: float = 1.0

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("code", name="uq_kpi_def_code"),
        Index("ix_kpi_def_name", "name"),
        Index("ix_kpi_def_test_type_code", "test_type_code"),
    )

    # ---------- KPI base ----------
class KpiScale(SQLModel, table=True):
    __tablename__ = "kpi_scales"
    id: Optional[int] = Field(default=None, primary_key=True)
    kpi_code: str = Field(index=True)  # no FK hard per evitare attriti cross-dialect
    band_min: float
    band_max: float
    score: int = Field(index=True)     # 1..4
    label: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

# ---------- Metriche derivate generiche ----------
class TestMetric(SQLModel, table=True):
    __tablename__ = "test_metrics"
    id: Optional[int] = Field(default=None, primary_key=True)
    run_type: str = Field(index=True)  # "TPP" | "MASSAGE" | "SPEED" | "SMT"
    run_id: int = Field(index=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    metric_code: str = Field(index=True)  # es: "REAL_TPP", "AVG_OVERMILK", ...
    value_num: float
    unit: Optional[str] = None
    context_json: Optional[str] = None  # JSON string (usiamo TEXT per compatibilità)
    computed_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("run_type", "run_id", "metric_code", "context_json",
                            name="ux_test_metrics_unique"),
    )

# ---------- Valori KPI generici ----------
class KpiValue(SQLModel, table=True):
    __tablename__ = "kpi_values"
    id: Optional[int] = Field(default=None, primary_key=True)
    run_type: str = Field(index=True)
    run_id: int = Field(index=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    kpi_code: str = Field(index=True)          # es: "CLOSURE", "SPEED", ...
    value_num: float                           # il valore usato per la scala
    score: int                                 # 1..4
    unit: Optional[str] = None
    context_json: Optional[str] = None         # es: {"agg":"final"} oppure {"flow":0.5}
    computed_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("run_type", "run_id", "kpi_code", "context_json",
                            name="ux_kpi_values_unique"),
    )

# ---------- TPP run ----------
class TppRun(SQLModel, table=True):
    __tablename__ = "tpp_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    real_tpp: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)



# ---------- MASSAGE runs & points ----------
class MassageRun(SQLModel, table=True):
    __tablename__ = "massage_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class MassagePoint(SQLModel, table=True):
    __tablename__ = "massage_points"
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="massage_runs.id", index=True)
    pressure_kpa: int = Field(index=True)  # 45, 40, 35
    min_val: float
    max_val: float
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("run_id", "pressure_kpa", name="ux_massage_point_run_pressure"),
    )
    

# --- SPEED TEST ---
class SpeedRun(SQLModel, table=True):
    __tablename__ = "speed_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    measure_ml: Optional[float] = None   # <— NUOVO campo singolo
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


# ---------- SMT/HOOD runs & points ----------
class SmtHoodRun(SQLModel, table=True):
    __tablename__ = "smt_hood_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class SmtHoodPoint(SQLModel, table=True):
    __tablename__ = "smt_hood_points"
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="smt_hood_runs.id", index=True)
    flow_code: int = Field(index=True)          # 5, 19, 36  ( = flow_lpm * 10 )
    flow_lpm: float = Field(nullable=False)     # 0.5, 1.9, 3.6
    smt_min: float = Field(nullable=False)
    smt_max: float = Field(nullable=False)
    hood_min: float = Field(nullable=False)
    hood_max: float = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("run_id", "flow_code", name="ux_smt_hood_point_run_flow"),
    )
