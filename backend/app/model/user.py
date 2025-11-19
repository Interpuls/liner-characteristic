from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint, Index
import sqlalchemy as sa
from app.common.enums import UserRole

class UnitSystem(str, Enum):
    METRIC = "metric"
    IMPERIAL = "imperial"

#Modello Tabella USER
class User(SQLModel, table=True):
    __tablename__ = "users"
    
    #Campi tabella
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    hashed_password: str
    role: UserRole = Field(
        default=UserRole.USER,
        sa_column=sa.Column(
            sa.Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
            default=UserRole.USER.value,
        ),
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    unit_system: UnitSystem = Field(
        default=UnitSystem.METRIC,
        sa_column=sa.Column(
            sa.Enum(UnitSystem, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
            default=UnitSystem.METRIC.value,
        ),
    )

    #Vincoli e indici
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_role", "role"),
        Index("ix_users_unit_system", "unit_system"),
    )
