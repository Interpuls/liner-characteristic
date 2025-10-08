from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, constr

# --------------- TEST TYPE SCHEMAS ----------------------------------
class TestTypeBase(BaseModel):
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