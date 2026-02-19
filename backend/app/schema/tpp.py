from datetime import datetime
from typing import Optional
from pydantic import ConfigDict
from .base import MetricNormalizedModel


# ---------------- TPP SCHEMAS ----------------

class TppRunBase(MetricNormalizedModel):
    product_application_id: int
    performed_at: Optional[datetime] = None
    real_tpp: Optional[float] = None
    notes: Optional[str] = None


class TppRunIn(TppRunBase):
    pass


class TppRunOut(TppRunBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
