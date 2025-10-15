from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import sqlalchemy as sa


class SmtHoodRun(SQLModel, table=True):
    __tablename__ = "smt_hood_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class SmtHoodPoint(SQLModel, table=True):
    __tablename__ = "smt_hood_points"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="smt_hood_runs.id", index=True)
    flow_code: int = Field(index=True)          #    5, 19, 36  (= flow_lpm * 10)
    flow_lpm: float = Field(nullable=False)     #    0.5, 1.9, 3.6
    smt_min: float = Field(nullable=False)
    smt_max: float = Field(nullable=False)
    hood_min: float = Field(nullable=False)
    hood_max: float = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint("run_id", "flow_code", name="ux_smt_hood_point_run_flow"),
    )
