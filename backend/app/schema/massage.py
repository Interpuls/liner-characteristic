from datetime import datetime
from typing import Optional, List
from pydantic import ConfigDict
from .base import MetricNormalizedModel


#----------- MASSAGE schemas ----------
#base
class MassagePointBase(MetricNormalizedModel):
    pressure_kpa: int  # 45, 40, 35
    min_val: float
    max_val: float

class MassagePointIn(MassagePointBase):
    pass

class MassagePointOut(MassagePointBase):
    id: int
    run_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

#base 
class MassageRunBase(MetricNormalizedModel):
    product_application_id: int
    performed_at: Optional[datetime] = None
    notes: Optional[str] = None


class MassageRunIn(MassageRunBase):
    points: List[MassagePointIn]        #almeno 1, idealmente 3


class MassageRunOut(MassageRunBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


