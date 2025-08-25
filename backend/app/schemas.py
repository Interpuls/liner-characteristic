from typing import Optional, Any, Dict, List
from pydantic import BaseModel, EmailStr, condecimal, constr

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
    code: constr(min_length=1, max_length=50)
    name: NameStr
    description: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    product_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    teat_size: Optional[str] = None
    # specifiche
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
    teat_sizes: List[str]
    kpis: List[str]  # per ora placeholder, popoleremo più avanti


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