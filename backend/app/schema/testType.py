from datetime import datetime
from typing import Optional
from pydantic import constr
from .base import MetricNormalizedModel

# --------------- TEST TYPE SCHEMAS ----------------------------------
class TestTypeBase(MetricNormalizedModel):
    code: constr(min_length=1, max_length=50)
    name: str
    description: Optional[str] = None
    

class TestTypeIn(TestTypeBase):
    pass


class TestTypeOut(TestTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
