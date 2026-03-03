from datetime import datetime
from typing import Optional
from pydantic import ConfigDict
from .base import MetricNormalizedModel


# ---------------- SPEED SCHEMAS ----------------

#base
class SpeedRunBase(MetricNormalizedModel):
    product_application_id: int
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None


class SpeedRunIn(SpeedRunBase):
    measure_ml: float


class SpeedRunOut(SpeedRunBase):
    id: int
    measure_ml: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
