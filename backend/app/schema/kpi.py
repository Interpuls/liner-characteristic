from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from enum import Enum
# Use the same enums as the ORM models to avoid mismatch
from ..model.kpi import FormulaType, TestKind

# --------------- KPI DEFINITIONS ----------------------

class KpiDefBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    test_type_code: TestKind
    formula_type: FormulaType
    formula_text: str
    inputs: Dict[str, Any] = {}
    weight: float = 1.0


class KpiDefIn(KpiDefBase):
    pass


class KpiDefOut(KpiDefBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --------------- KPI SCALE ----------------------------

class KpiScaleBandIn(BaseModel):
    band_min: float
    band_max: float
    score: int
    label: Optional[str] = None


class KpiScaleUpsertIn(BaseModel):
    bands: List[KpiScaleBandIn]

# --------------- KPI VALUES -----------------------------

class KpiValueOut(BaseModel):
    kpi_code: str
    value_num: float
    score: int
    unit: Optional[str] = None
    context_json: Optional[str] = None
    computed_at: datetime

    class Config:
        from_attributes = True
