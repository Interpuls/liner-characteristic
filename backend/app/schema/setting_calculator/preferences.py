from datetime import datetime
from typing import Dict, Any

from pydantic import ConfigDict

from app.schema.base import MetricNormalizedModel


class SettingComparisonPreferenceIn(MetricNormalizedModel):
    name: str
    payload: Dict[str, Any]


class SettingComparisonPreferenceOut(MetricNormalizedModel):
    id: int
    name: str
    payload: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

