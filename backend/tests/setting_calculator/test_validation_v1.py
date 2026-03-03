import pytest
from pydantic import ValidationError

from app.services.setting_calculator.validation_v1 import validate_compare_request
from app.schema.setting_calculator.request_v1 import UserInputsV1


def make_inputs(
    max_kpa=42.0,
    pf_kpa=38.0,
    om_kpa=30.0,
    freq=60.0,
    ratio=60.0,
    a=150.0,
    c=150.0,
):
    return UserInputsV1(
        milkingVacuumMaxKpa=max_kpa,
        pfVacuumKpa=pf_kpa,
        omVacuumKpa=om_kpa,
        omDurationSec=60.0,
        frequencyBpm=freq,
        ratioPct=ratio,
        phaseAMs=a,
        phaseCMs=c,
    )


def test_validation_ok():
    left = make_inputs()
    right = make_inputs()

    errors = validate_compare_request(left, right)

    assert errors == []


def test_pf_greater_than_max():
    left = make_inputs(pf_kpa=50.0)
    right = make_inputs()

    errors = validate_compare_request(left, right)

    assert any("pfVacuumKpa" in e.path for e in errors)


def test_ratio_zero_invalid_schema():
    with pytest.raises(ValidationError):
        make_inputs(ratio=0.0)


def test_phaseA_exceeds_on():
    # ON = 600 ms → metto A = 700
    left = make_inputs(a=700.0)
    right = make_inputs()

    errors = validate_compare_request(left, right)

    assert any("phaseAMs" in e.path for e in errors)
