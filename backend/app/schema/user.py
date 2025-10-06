from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.model.user import UserRole

#user schemas
class UserBase(BaseModel):
    email: EmailStr
    role: Optional[UserRole] = UserRole.user
    is_active: Optional[bool] = True

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