from datetime import datetime
from typing import List, Optional, Dict, Any, ClassVar
from pydantic import BaseModel, validator, Field
from enum import Enum


#product schemas
class ProductBase(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

    product_type: Optional[str] = "liner"
    brand: Optional[str] = None
    model: Optional[str] = None
    compound: str = "STD"
    only_admin: bool = False
    notes: Optional[str] = None

    manufactured_at: Optional[datetime] = None

#spechifiche tecniche
    spider_wash_cup: Optional[float] = None
    wash_cup: Optional[float] = None
    shell_type: Optional[float] = None

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

    # nuovi campi
    robot_liner: Optional[bool] = False
    

    # barrel shape: one of "round" | "triangular" | "squared"
    barrel_shape: Optional[str] = None
    reference_areas: Optional[List[str]] = None

    # allowed reference areas (include Global as special)
    REFERENCE_AREAS_ALLOWED: ClassVar[List[str]] = [
        "North America",
        "South America",
        "Europe",
        "Africa",
        "China",
        "Middle East",
        "Far East",
        "Oceania",
        "Global",
    ]

    # allowed barrel shapes (normalized to lowercase)
    BARREL_SHAPES_ALLOWED: ClassVar[List[str]] = [
        "round",
        "triangular",
        "squared",
    ]

    @validator("reference_areas")
    def _validate_reference_areas(cls, v):
        if v is None:
            return v
        if any(area not in cls.REFERENCE_AREAS_ALLOWED for area in v):
            raise ValueError("Invalid reference area value")
        if "Global" in v and len(v) > 1:
            raise ValueError("If 'Global' is set, it must be the only value")
        return v

    @validator("barrel_shape")
    def _validate_barrel_shape(cls, v):
        if v is None:
            return v
        s = str(v).strip().lower()
        if s not in cls.BARREL_SHAPES_ALLOWED:
            raise ValueError("Invalid barrel_shape value")
        return s



class ProductIn(ProductBase):
        pass



class ProductOut(ProductBase):
        id: int
        created_at: datetime

        class Config:
            from_attributes  = True

# ------------------ PRODUCT PREFERENCE SCHEMAS ------------------
#classi per salvataggio filtri 

class ProductPreferenceIn(BaseModel):
    name: str
    filters: Dict[str, Any] 


class ProductPreferenceOut(BaseModel):
    id: int
    name: str
    filters: Dict[str, Any]

    class Config:
        from_attributes = True


# ------------------ PRODUCT META SCHEMA ------------------

class ProductMetaOut(BaseModel):
    product_types: List[str]
    brands: List[str]
    models: List[str]
    compounds: List[str]
    teat_sizes: List[int]
    #kpis: List["KpiDefOut"]  # riferimento al modello KPI definito dopo

#--------------- PRODUCT APPLICATION SCHEMAS ------------------------

#allowed teat sizes
ALLOWED_SIZES = {40, 50, 60, 70}

SIZE_LABELS = {
    40: "Short",
    50: "Medium",
    60: "Long",
    70: "Extra Long",
}


class ProductApplicationIn(BaseModel):
    size_mm: int = Field(..., description="One of 40, 50, 60, 70")
    label: Optional[str] = None

#validazione
    @validator("size_mm")
    def validate_size(cls, v):
        if v not in ALLOWED_SIZES:
            raise ValueError(f"size_mm must be one of {ALLOWED_SIZES}")
        return v
    # placeholder for future validators


class ProductApplicationOut(BaseModel):
    id: int
    product_id: int
    size_mm: int
    label: str
    created_at: datetime

    class Config:
        from_attributes = True
