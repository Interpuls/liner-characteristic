from datetime import datetime
from typing import Optional
from pydantic import EmailStr
from enum import Enum
from ..model.user import UserRole
from .base import MetricNormalizedModel

#output unit system enum
class UnitSystem(str, Enum):
    METRIC = "metric"
    IMPERIAL = "imperial"

#user schemas
class UserBase(MetricNormalizedModel):
    email: EmailStr
    role: Optional[UserRole] = UserRole.USER
    is_active: Optional[bool] = True
    unit_system: UnitSystem = UnitSystem.METRIC

#user create che eredita da UserBase
class UserCreate(UserBase):
    password: str

#ex UserOut 
class UserRead(UserBase):
    id: int
    
    #questo permette di creare un modello Pydantic da un modello SQLAlchemy
    #e di convertire quindi direttamente i dati nei nostri schemi
    class Config:
        from_attributes = True

#aggiorna lo unit_system dello user
class UserUpdate(MetricNormalizedModel):
    unit_system: Optional[UnitSystem] = None
