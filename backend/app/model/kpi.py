from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column, JSON
import sqlalchemy as sa
from app.common.enums import FormulaType, TestKind

#--------------- KPI MODELS --------------------------

class KpiDef(SQLModel, table=True):
    __tablename__ = "kpi_def"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None

    test_type_code: TestKind = Field(index=True)

    formula_type: FormulaType
    formula_text: str
    inputs: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))

    weight: float = 1.0

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint("code", name="uq_kpi_def_code"),
        sa.Index("ix_kpi_def_name", "name"),
        sa.Index("ix_kpi_def_test_type_code", "test_type_code"),
    )

# --------------- KPI SCALE --------------------------

class KpiScale(SQLModel, table=True):
    __tablename__ = "kpi_scales"

    id: Optional[int] = Field(default=None, primary_key=True)
    kpi_code: str = Field(index=True)
    band_min: float
    band_max: float
    score: int = Field(index=True)  # 1..4
    label: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#--------------- TEST METRICHE --------------------------
#metriche derivate generiche

class TestMetric(SQLModel, table=True):
    __tablename__ = "test_metrics"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_type: str = Field(index=True)  # TPP | MASSAGE | SPEED | SMT_HOOD
    run_id: int = Field(index=True)
    product_application_id: int = Field(
        foreign_key="product_applications.id",
        index=True
    )
    metric_code: str = Field(index=True)
    value_num: float
    unit: Optional[str] = None
    context_json: Optional[str] = None# JSON string (usiamo TEXT per compatibilità)
    computed_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint(
            "run_type", "run_id", "metric_code", "context_json",
            name="ux_test_metrics_unique"
        ),
    )

# --------------- KPI VALUE ----------------------------------
#valori generici KPI

class KpiValue(SQLModel, table=True):
    __tablename__ = "kpi_values"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_type: str = Field(index=True)
    run_id: int = Field(index=True)
    product_application_id: int = Field(
        foreign_key="product_applications.id",
        index=True
    )
    kpi_code: str = Field(index=True)
    value_num: float
    score: int
    unit: Optional[str] = None
    context_json: Optional[str] = None
    computed_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint(
            "run_type", "run_id", "kpi_code", "context_json",
            name="ux_kpi_values_unique"
        ),
    )
