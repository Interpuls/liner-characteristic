from typing import List, Literal, Optional
from pydantic import Field

from app.schema.base import MetricNormalizedModel


class FieldErrorV1(MetricNormalizedModel):
    path: str
    reason: str


class ErrorBodyV1(MetricNormalizedModel):
    code: str = "VALIDATION_ERROR"
    message: str = "Invalid inputs"
    fields: List[FieldErrorV1] = Field(default_factory=list)


class ValidationErrorResponseV1(MetricNormalizedModel):
    schemaVersion: Literal["1.0"] = "1.0"
    requestId: Optional[str] = None
    error: ErrorBodyV1
