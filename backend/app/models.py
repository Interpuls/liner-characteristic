from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = Field(default="user")  # "user" | "admin"
    is_active: bool = Field(default=True)

class Liner(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    massage_intensity: float = 0.0
    smt_fluctuation: float = 0.0
    hoodcup_fluctuation: float = 0.0
