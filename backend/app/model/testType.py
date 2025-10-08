from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel, Index
import sqlalchemy as sa

#test type model (definizione dei tipi di test)
class TestType(SQLModel, table=True):
    
    __tablename__ = "test_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)          
    name: str                              
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

#vincoli
    __table_args__ = (
        sa.UniqueConstraint("code", name="uq_test_types_code"),
        Index("ix_test_types_name", "name"),
    )