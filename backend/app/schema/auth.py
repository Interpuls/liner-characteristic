from typing import Optional
from pydantic import EmailStr, condecimal, constr
from .base import MetricNormalizedModel
from .user import UnitSystem


# ------------------------------------------------------
#  GLOBAL TYPES 
# ------------------------------------------------------

NameStr = constr(min_length=2, max_length=100)
Num01 = condecimal(ge=0, max_digits=6, decimal_places=3)


# ------------------------------------------------------
#  AUTH & TOKEN SCHEMAS
# ------------------------------------------------------

#token restituito al login
class Token(MetricNormalizedModel):
    access_token: str
    token_type: str = "bearer"
    unit_system: UnitSystem = UnitSystem.METRIC

#dati del token
class TokenData(MetricNormalizedModel):
    sub: Optional[str] = None  # email o user_id
    role: Optional[str] = None  # ruolo utente (admin/user)
    unit_system: Optional[UnitSystem] = None

#credenziali
class LoginInput(MetricNormalizedModel):
    email: EmailStr
    password: str
