from typing import Optional, Any, Dict, List
from pydantic import BaseModel, EmailStr, condecimal, constr, Field
from enum import Enum
from datetime import datetime

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


# --------------- PRODUCT SCHEMAS -------------------------------

class ProductIn(BaseModel):
    # li generiamo lato backend
    code: Optional[constr(min_length=1, max_length=50)] = None
    name:  Optional[str] = None

    description: Optional[str] = None
    brand: constr(min_length=1)
    model: constr(min_length=1)
    
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

class ProductOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    product_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    # specifiche
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

    class Config:
        from_attributes = True

class ProductPreferenceIn(BaseModel):
    name: str
    filters: Dict[str, Any]  # es: {"product_type":"liner","brand":"X","kpi":[...]}

class ProductPreferenceOut(BaseModel):
    id: int
    name: str
    filters: Dict[str, Any]
    class Config:
        from_attributes = True

class ProductMetaOut(BaseModel):
    product_types: List[str]
    brands: List[str]
    models: List[str]
    teat_sizes: List[int]
    kpis: List["KpiDefOut"] 

# --------------- PRODUCT APPLICATION SCHEMAS (Teat Size) -------------------------------
ALLOWED_SIZES = {40, 50, 60, 70}
SIZE_LABELS = {
    40: "Short",
    50: "Medium",
    60: "Long",
    70: "Extra Long"
}

class ProductApplicationIn(BaseModel):
    size_mm: int = Field(..., description="One of 40, 50, 60, 70")
    @classmethod
    def validate_size(cls, v: int) -> int:
        if v not in SIZE_LABELS:
            raise ValueError("size_mm must be one of 40, 50, 60, 70")
        return v

    def model_post_init(self, _ctx) -> None:
        self.size_mm = self.validate_size(self.size_mm)


class ProductApplicationOut(BaseModel):
    id: int
    product_id: int
    size_mm: int
    label: str

    class Config:
        from_attributes = True

# --------------- TEST TYPE SCHEMAS ----------------------------------

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
    SMT = "SMT"

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