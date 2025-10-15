from typing import Optional
from pydantic import BaseModel, EmailStr, condecimal, constr


# ------------------------------------------------------
#  GLOBAL TYPES 
# ------------------------------------------------------

NameStr = constr(min_length=2, max_length=100)
Num01 = condecimal(ge=0, max_digits=6, decimal_places=3)


# ------------------------------------------------------
#  AUTH & TOKEN SCHEMAS
# ------------------------------------------------------

#token restituito al login
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

#dati del token
class TokenData(BaseModel):
    sub: Optional[str] = None  # email o user_id
    role: Optional[str] = None  # ruolo utente (admin/user)

#credenziali
class LoginInput(BaseModel):
    email: EmailStr
    password: str
