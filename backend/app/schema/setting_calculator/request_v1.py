from typing import Literal, Optional 
from pydantic import Field

from app.schema.base import MetricNormalizedModel


class UserInputsV1(MetricNormalizedModel):
    milkingVacuumMaxInHg: Optional[float] = None
    pfVacuumInHg: Optional[float] = None
    omVacuumInHg: Optional[float] = None
    
    milkingVacuumMaxKpa: Optional[float] = None
    pfVacuumKpa: Optional[float] = None
    omVacuumKpa: Optional[float] = None
    
    omDurationSec: float = Field(..., ge=0)

    frequencyBpm: float = Field(..., gt=0)
    ratioPct: float = Field(..., gt=0, lt=100)

    phaseAMs: float = Field(..., gt=0)
    phaseCMs: float = Field(..., gt=0)


class SideRequestV1(MetricNormalizedModel):
    productApplicationId: int = Field(..., gt=0)
    inputs: UserInputsV1


class CompareRequestV1(MetricNormalizedModel):
    schemaVersion: Literal["1.0"] = "1.0"
    requestId: str

    left: SideRequestV1
    right: SideRequestV1
