from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from enum import Enum

# --------------- ENUM ----------------------------------

class FormulaType(str, Enum):
    SQL = "SQL"
    PY  = "PY"
    AGG = "AGG"

class TestKind(str, Enum):
    TPP = "TPP"
    MASSAGE = "MASSAGE"
    SPEED = "SPEED"
    SMT_HOOD = "SMT_HOOD"

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