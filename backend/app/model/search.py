from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON
import sqlalchemy as sa

#search preferences model
class SearchPreference(SQLModel, table=True):
    __tablename__ = "search_preferences"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=sa.Column(sa.Integer, 
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True)
        
    )
    name: str = Field(index=True)  #nome del preset salvato

    #JSON di filtri 
    filters: Dict[str, Any] = Field(sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("user_id", "name", name="uq_user_pref_name"),
    )
