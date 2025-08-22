from typing import Optional
from pydantic import BaseModel, EmailStr, condecimal, constr

NameStr = constr(min_length=2, max_length=100)
Num01 = condecimal(ge=0, max_digits=6, decimal_places=3)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

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

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class ProductIn(BaseModel):
    code: constr(min_length=1, max_length=50)
    name: NameStr
    description: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    orifice_diameter: Optional[float] = None
    class Config:
        from_attributes = True