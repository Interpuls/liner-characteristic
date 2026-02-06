from datetime import datetime
from typing import Optional

from .base import MetricNormalizedModel


class NewsBase(MetricNormalizedModel):
    title: str
    body: str
    image_url: Optional[str] = None
    is_published: bool = False
    created_by: Optional[str] = None


class NewsCreate(MetricNormalizedModel):
    title: str
    body: str
    image_url: Optional[str] = None
    is_published: bool = False


class NewsUpdate(MetricNormalizedModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    is_published: Optional[bool] = None


class NewsRead(NewsBase):
    id: int
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True
