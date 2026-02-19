from typing import List, Literal
from pydantic import Field

from app.schema.base import MetricNormalizedModel


class PointV1(MetricNormalizedModel):
    xMs: float = Field(..., ge=0)
    yKpa: float = Field(..., ge=0)


class CurveV1(MetricNormalizedModel):
    label: str
    points: List[PointV1]


class PulsationChartV1(MetricNormalizedModel):
    curve: CurveV1
    threshold: CurveV1


class SegmentV1(MetricNormalizedModel):
    key: str  # "A"|"B"|"C"|"D"
    valueMs: float = Field(..., ge=0)


class PulsatorPhasesChartV1(MetricNormalizedModel):
    segments: List[SegmentV1]


class BarV1(MetricNormalizedModel):
    key: str
    valueMs: float = Field(..., ge=0)


class RealMilkingMassageChartV1(MetricNormalizedModel):
    bars: List[BarV1]


class ChartsV1(MetricNormalizedModel):
    pulsation: PulsationChartV1
    pulsatorPhases: PulsatorPhasesChartV1
    realMilkingMassage: RealMilkingMassageChartV1


class LinerInfoV1(MetricNormalizedModel):
    id: int
    model: str
    brand: str

    tppKpa: float = Field(..., ge=0)
    intensityPfKpa: float = Field(..., ge=0)
    intensityOmKpa: float = Field(..., ge=0)


class DerivedV1(MetricNormalizedModel):
    tMs: float = Field(..., gt=0)

    aMs: float = Field(..., ge=0)
    bMs: float = Field(..., ge=0)
    cMs: float = Field(..., ge=0)
    dMs: float = Field(..., ge=0)

    onMs: float = Field(..., ge=0)
    offMs: float = Field(..., ge=0)

    deltaKpa: float = Field(..., ge=0)
    tStartMs: float = Field(..., ge=0)
    tEndMs: float = Field(..., ge=0)

    bRealMs: float = Field(..., ge=0)
    realMilkingMs: float = Field(..., ge=0)
    realOffMs: float = Field(..., ge=0)


class InputsUsedV1(MetricNormalizedModel):
    milkingVacuumMaxKpa: float
    pfVacuumKpa: float
    omVacuumKpa: float
    omDurationSec: float
    frequencyBpm: float
    ratioPct: float
    phaseAMs: float
    phaseCMs: float


class SideResultV1(MetricNormalizedModel):
    liner: LinerInfoV1
    inputsUsed: InputsUsedV1
    derived: DerivedV1
    charts: ChartsV1
    warnings: List[str] = Field(default_factory=list)


class DiffPairV1(MetricNormalizedModel):
    pf: float
    om: float


class DiffPctV1(MetricNormalizedModel):
    appliedVacuum: DiffPairV1
    massageIntensity: DiffPairV1


class CompareResponseV1(MetricNormalizedModel):
    schemaVersion: Literal["1.0"] = "1.0"
    engineVersion: str
    requestId: str

    left: SideResultV1
    right: SideResultV1

    diffPct: DiffPctV1
    warnings: List[str] = Field(default_factory=list)
