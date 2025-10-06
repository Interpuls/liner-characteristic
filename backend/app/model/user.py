from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint, Index

#Ruoli utente
class UserRole(str, Enum):
    admin = "admin"
    user = "user"

#Modello Tabella USER
class User(SQLModel, table=True):
    __tablename__ = "users"
    
    #Campi tabella
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.user)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    #Vincoli e indici
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_role", "role"),
    )