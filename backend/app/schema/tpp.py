from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ---------------- TPP SCHEMAS ----------------

class TppRunBase(BaseModel):
    product_application_id: int
    performed_at: Optional[datetime] = None
    real_tpp: Optional[float] = None
    notes: Optional[str] = None


class TppRunIn(TppRunBase):
    pass


class TppRunOut(TppRunBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
