from __future__ import annotations

from typing import List

from app.schema.setting_calculator.request_v1 import UserInputsV1
from app.schema.setting_calculator.response_v1 import (
    SideResultV1,
    LinerInfoV1,
    DerivedV1,
    ChartsV1,
    PulsationChartV1,
    CurveV1,
    PointV1,
    PulsatorPhasesChartV1,
    SegmentV1,
    RealMilkingMassageChartV1,
    BarV1,
    InputsUsedV1,
)


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(x, hi))


def compute_side_result_v1(
    liner: LinerInfoV1,
    inputs: UserInputsV1,
) -> SideResultV1:

    warnings: List[str] = []

    # -------------------------
    # 1) DERIVED DURATIONS
    # -------------------------
    max_kpa = float(inputs.milkingVacuumMaxKpa)
    pf_kpa = float(inputs.pfVacuumKpa)
    om_kpa = float(inputs.omVacuumKpa)

    frequency = float(inputs.frequencyBpm)
    ratio = float(inputs.ratioPct)

    a_ms = float(inputs.phaseAMs)
    c_ms = float(inputs.phaseCMs)

    t_ms = 60000.0 / frequency
    on_ms = t_ms * (ratio / 100.0)
    off_ms = t_ms - on_ms

    b_ms = on_ms - a_ms
    d_ms = off_ms - c_ms

    # -------------------------
    # 2) DELTA + REAL WINDOW
    # -------------------------
    delta_raw = max_kpa - liner.tppKpa
    delta_effective = _clamp(delta_raw, 0.0, max_kpa)


    if max_kpa <= 0:
        raise ValueError("milkingVacuumMaxKpa must be > 0")

    if delta_effective <= 0:
        b_real_ms = t_ms
        warnings.append("delta<=0: real window covers full cycle")
        t_start_ms = 0.0
        t_end_ms = t_ms
    elif delta_effective >= max_kpa:
        b_real_ms = 0.0
        warnings.append("delta>=max: real window empty")
        t_start_ms = 0.0
        t_end_ms = 0.0
    else:
        # salita lineare fase A
        t_start_ms = a_ms * (delta_effective / max_kpa)

        # discesa lineare fase C
        # t_end = (A+B) + C * (1 - delta/max)
        t_end_ms = (a_ms + b_ms) + c_ms * (1.0 - delta_effective / max_kpa)

        b_real_ms = t_end_ms - t_start_ms

    b_real_ms = _clamp(b_real_ms, 0.0, t_ms)
    real_milking_ms = b_real_ms
    real_off_ms = t_ms - b_real_ms

    # -------------------------
    # 3) BUILD CHARTS
    # -------------------------

    # Pulsation grafico
    pulsation_curve = CurveV1(
        label=liner.model,
        points=[
            PointV1(xMs=0.0, yKpa=0.0),
            PointV1(xMs=a_ms, yKpa=max_kpa),
            PointV1(xMs=a_ms + b_ms, yKpa=max_kpa),
            PointV1(xMs=a_ms + b_ms + c_ms, yKpa=0.0),
            PointV1(xMs=t_ms, yKpa=0.0),
        ],
    )

    delta_for_chart = delta_effective

    threshold_curve = CurveV1(
        label="Real B threshold",
        points=[
            PointV1(xMs=0.0, yKpa=delta_for_chart),
            PointV1(xMs=t_ms, yKpa=delta_for_chart),
        ],
    )

    pulsation_chart = PulsationChartV1(
        curve=pulsation_curve,
        threshold=threshold_curve,
    )

    phases_chart = PulsatorPhasesChartV1(
        segments=[
            SegmentV1(key="A", valueMs=a_ms),
            SegmentV1(key="B", valueMs=b_ms),
            SegmentV1(key="C", valueMs=c_ms),
            SegmentV1(key="D", valueMs=d_ms),
        ]
    )

    real_chart = RealMilkingMassageChartV1(
        bars=[
            BarV1(key="Real Milking", valueMs=real_milking_ms),
            BarV1(key="Real OFF", valueMs=real_off_ms),
        ]
    )

    charts = ChartsV1(
        pulsation=pulsation_chart,
        pulsatorPhases=phases_chart,
        realMilkingMassage=real_chart,
    )

    # -------------------------
    # 4) DERIVED OBJECT
    # -------------------------

    derived = DerivedV1(
        tMs=t_ms,
        aMs=a_ms,
        bMs=b_ms,
        cMs=c_ms,
        dMs=d_ms,
        onMs=on_ms,
        offMs=off_ms,
        deltaKpa=delta_effective,
        tStartMs=t_start_ms,
        tEndMs=t_end_ms,
        bRealMs=b_real_ms,
        realMilkingMs=real_milking_ms,
        realOffMs=real_off_ms,
    )

    inputs_used = InputsUsedV1(
        milkingVacuumMaxKpa=max_kpa,
        pfVacuumKpa=pf_kpa,
        omVacuumKpa=om_kpa,
        omDurationSec=float(inputs.omDurationSec),
        frequencyBpm=frequency,
        ratioPct=ratio,
        phaseAMs=a_ms,
        phaseCMs=c_ms,
    )

    return SideResultV1(
        liner=liner,
        inputsUsed=inputs_used,
        derived=derived,
        charts=charts,
        warnings=warnings,
    )

def applied_vacuum_abs(inputs: UserInputsV1, derived: DerivedV1) -> tuple[float, float]:
    
    freq = float(inputs.frequencyBpm)
    b_real_ms = float(derived.bRealMs)

    pf = float(inputs.pfVacuumKpa) * freq * (b_real_ms / 60000.0)
    om = float(inputs.omVacuumKpa) * freq * (b_real_ms / 60000.0)
    return pf, om


def applied_massage_abs(inputs: UserInputsV1, derived: DerivedV1, liner: LinerInfoV1) -> tuple[float, float]:

    freq = float(inputs.frequencyBpm)
    real_off_ms = float(derived.realOffMs)

    pf_db = liner.intensityPfKpa
    om_db = liner.intensityOmKpa

    pf = pf_db * freq * (real_off_ms / 60000.0)
    om = om_db * freq * (real_off_ms / 60000.0)
    return pf, om