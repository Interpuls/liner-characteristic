from __future__ import annotations

from typing import Optional
from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint, Index


# --------------- USER MODELS ----------------------------------

class UserRole(str, Enum):
    admin = "admin"
    user = "user"

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.user)
    is_active: bool = Field(default=True)  
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_role", "role"),
    )


# --------------- PRODUCT MODELS -------------------------------

class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)  
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("code", name="uq_products_code"),
        Index("ix_products_name", "name"),
    )


# --------------- TEST TYPE MODELS ----------------------------------

class TestType(SQLModel, table=True):
    __tablename__ = "test_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str 
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("code", name="uq_test_types_code"),
        Index("ix_test_types_name", "name"),
    )