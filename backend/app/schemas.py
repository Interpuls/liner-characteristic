from typing import Optional, Any, Dict, List
from pydantic import BaseModel, EmailStr, condecimal, constr, Field
from pydantic import field_validator
from enum import Enum
from datetime import datetime, date

NameStr = constr(min_length=2, max_length=100)
Num01 = condecimal(ge=0, max_digits=6, decimal_places=3)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginInput(BaseModel):
    email: EmailStr
    password: str

# --------------- USER SCHEMAS ----------------------------------
"""
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "user"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    class Config:
        from_attributes = True
"""

# --------------- PRODUCT SCHEMAS -------------------------------\n# Moved to app/schema/product.py to avoid duplication and merge conflicts.\n\n# --------------- TEST TYPE SCHEMAS ----------------------------------

class TestTypeIn(BaseModel):
    code: constr(min_length=1, max_length=50)
    name: NameStr
    description: Optional[str] = None

class TestTypeOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True


# --------------- KPI SCHEMAS ----------------------------------

class FormulaType(str, Enum):
    SQL = "SQL"
    PY  = "PY"
    AGG = "AGG"

class TestKind(str, Enum):
    TPP = "TPP"
    MASSAGE = "MASSAGE"
    SPEED = "SPEED"
    SMT_HOOD = "SMT_HOOD"

class KpiDefIn(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    test_type_code: TestKind            # <-- qui
    formula_type: FormulaType
    formula_text: str
    inputs: Dict[str, Any] = {}
    weight: float = 1.0

class KpiDefOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    test_type_code: TestKind            # <-- qui
    formula_type: FormulaType
    formula_text: str
    inputs: Dict[str, Any]
    weight: float

    class Config:
        from_attributes = True

# ------- KPI (scale) -------
class KpiScaleBandIn(BaseModel):
    band_min: float
    band_max: float
    score: int
    label: Optional[str] = None

class KpiScaleUpsertIn(BaseModel):
    bands: List[KpiScaleBandIn]

# ------- TPP runs -------
class TppRunIn(BaseModel):
    product_application_id: int
    real_tpp: float
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None

class TppRunOut(BaseModel):
    id: int
    product_application_id: int
    real_tpp: Optional[float]
    performed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class KpiValueOut(BaseModel):
    kpi_code: str
    value_num: float
    score: int
    unit: Optional[str] = None
    context_json: Optional[str] = None
    computed_at: datetime


# MASSAGE schemas
class MassagePointIn(BaseModel):
    pressure_kpa: int  # 45, 40, 35
    min_val: float
    max_val: float

class MassageRunIn(BaseModel):
    product_application_id: int
    points: List[MassagePointIn]         # almeno 1, idealmente 3
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None

class MassageRunOut(BaseModel):
    id: int
    product_application_id: int
    performed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class MassagePointOut(BaseModel):
    id: int
    run_id: int
    pressure_kpa: int
    min_val: float
    max_val: float
    created_at: datetime
    class Config:
        from_attributes = True


# --- SPEED TEST ---
class SpeedRunIn(BaseModel):
    product_application_id: int
    measure_ml: float
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None

class SpeedRunOut(BaseModel):
    id: int
    product_application_id: int
    measure_ml: Optional[float]
    performed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True
    

# ---------- SMT/HOOD schemas ----------
class SmtHoodPointIn(BaseModel):
    flow_lpm: float                 # 0.5, 1.9, 3.6
    smt_min: float
    smt_max: float
    hood_min: float
    hood_max: float

class SmtHoodRunIn(BaseModel):
    product_application_id: int
    points: List[SmtHoodPointIn]    # attesi 3 punti (uno per flow)
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None

class SmtHoodRunOut(BaseModel):
    id: int
    product_application_id: int
    performed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class SmtHoodPointOut(BaseModel):
    id: int
    run_id: int
    flow_lpm: float
    smt_min: float
    smt_max: float
    hood_min: float
    hood_max: float
    created_at: datetime
    class Config:
        from_attributes = True

