from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from app.schema.setting_calculator.request_v1 import UserInputsV1


@dataclass(frozen=True)
class FieldError:
    path: str
    reason: str

def _require(side: str, field: str, value) -> Optional[FieldError]:
    if value is None:
        return FieldError(f"{side}.inputs.{field}", "is required (provide Kpa or InHg)")
    return None


def validate_user_inputs(side: str, inputs: UserInputsV1) -> List[FieldError]:
    """
    Multi-field business validation (range minimi già coperti dai Pydantic Field()).
    side: "left" | "right"
    """
    errs: List[FieldError] = []
    p = f"{side}.inputs"

    for f in [
      "milkingVacuumMaxKpa","pfVacuumKpa","omVacuumKpa",
      "frequencyBpm","ratioPct","phaseAMs","phaseCMs","omDurationSec"
    ]:
        err = _require(side, f, getattr(inputs, f))
        if err: errs.append(err)
    if errs: return errs    

    # Vincoli Milking Vacuum
    if inputs.pfVacuumKpa > inputs.milkingVacuumMaxKpa:
        errs.append(FieldError(f"{p}.pfVacuumKpa", "must be <= milkingVacuumMaxKpa"))

    if inputs.omVacuumKpa > inputs.milkingVacuumMaxKpa:
        errs.append(FieldError(f"{p}.omVacuumKpa", "must be <= milkingVacuumMaxKpa"))

    if inputs.milkingVacuumMaxKpa <= 0: 
        errs.append(FieldError(f"{p}.milkingVacuumMaxKpa", "must be > 0"))

    # (opzionale, da verific con alle)
    if inputs.pfVacuumKpa < inputs.omVacuumKpa:
        errs.append(FieldError(f"{p}.pfVacuumKpa", "should be >= omVacuumKpa"))

    # Vincoli percentuale tra 0 e 100 (non inclusi)
    if inputs.ratioPct <= 0 or inputs.ratioPct >= 100: 
        errs.append(FieldError(f"{p}.ratioPct", "must be between 0 and 100"))


    # Derivate fasi
    # tMs = 60000 / f
    t_ms = 60000.0 / inputs.frequencyBpm
    on_ms = t_ms * (inputs.ratioPct / 100.0)
    off_ms = t_ms - on_ms

    # Consistenza ratio (ridondante perché ratioPct è ma teniamolo per sicurezza)
    if on_ms <= 0:
        errs.append(FieldError(f"{p}.ratioPct", "ratioPct results in ON_ms <= 0"))
    if off_ms <= 0:
        errs.append(FieldError(f"{p}.ratioPct", "ratioPct results in OFF_ms <= 0"))

    # B = ON - A ; D = OFF - C
    b_ms = on_ms - inputs.phaseAMs
    d_ms = off_ms - inputs.phaseCMs

    if b_ms < 0:
        errs.append(
            FieldError(
                f"{p}.phaseAMs",
                "phaseAMs cannot exceed ON_ms (ratioPct/frequencyBpm combination)",
            )
        )

    if d_ms < 0:
        errs.append(
            FieldError(
                f"{p}.phaseCMs",
                "phaseCMs cannot exceed OFF_ms (ratioPct/frequencyBpm combination)",
            )
        )

    return errs


def validate_compare_request(left_inputs: UserInputsV1, right_inputs: UserInputsV1) -> List[FieldError]:
    errs: List[FieldError] = []
    errs.extend(validate_user_inputs("left", left_inputs))
    errs.extend(validate_user_inputs("right", right_inputs))
    return errs
