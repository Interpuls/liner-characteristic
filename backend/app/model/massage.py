from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import sqlalchemy as sa


class MassageRun(SQLModel, table=True):
    __tablename__ = "massage_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MassagePoint(SQLModel, table=True):
    __tablename__ = "massage_points"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="massage_runs.id", index=True)
    pressure_kpa: int = Field(index=True)  # 45, 40, 35
    min_val: float
    max_val: float
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint("run_id", "pressure_kpa", name="ux_massage_point_run_pressure"),
    )
