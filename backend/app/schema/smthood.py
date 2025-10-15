from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ---------------- SMT/HOOD SCHEMAS ----------------

#base
class SmtHoodPointBase(BaseModel):
    flow_lpm: float                 # 0.5, 1.9, 3.6
    smt_min: float
    smt_max: float
    hood_min: float
    hood_max: float


class SmtHoodPointIn(SmtHoodPointBase):
    pass


class SmtHoodPointOut(SmtHoodPointBase):
    id: int
    run_id: int
    created_at: datetime

    class Config:
        from_attributes = True

#base
class SmtHoodRunBase(BaseModel):
    product_application_id: int
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None


class SmtHoodRunIn(SmtHoodRunBase):
    points: List[SmtHoodPointIn]    # attesi 3 punti (uno per flow)


class SmtHoodRunOut(SmtHoodRunBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
