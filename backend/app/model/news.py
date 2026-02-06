from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field
from sqlalchemy import Index


class News(SQLModel, table=True):
    __tablename__ = "news"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True, nullable=False)
    body: str = Field(nullable=False)
    image_url: Optional[str] = Field(default=None, nullable=True)
    created_by: Optional[str] = Field(default=None, index=True)
    is_published: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    published_at: Optional[datetime] = Field(default=None, nullable=True)

    __table_args__ = (
        Index("ix_news_published_at", "published_at"),
    )
