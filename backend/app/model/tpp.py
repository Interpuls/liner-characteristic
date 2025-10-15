from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class TppRun(SQLModel, table=True):
    __tablename__ = "tpp_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_application_id: int = Field(foreign_key="product_applications.id", index=True)
    performed_at: Optional[datetime] = None
    real_tpp: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
