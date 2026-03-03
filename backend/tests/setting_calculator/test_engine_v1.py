import pytest

from app.services.setting_calculator.engine_v1 import compute_side_result_v1
from app.schema.setting_calculator.response_v1 import LinerInfoV1
from app.schema.setting_calculator.request_v1 import UserInputsV1


def make_liner(tpp=10.0, pf=20.0, om=15.0):
    return LinerInfoV1(
        id=1,
        model="TestLiner",
        brand="TestBrand",
        tppKpa=tpp,
        intensityPfKpa=pf,
        intensityOmKpa=om,
    )


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


def test_engine_basic_cycle():
    liner = make_liner()
    inputs = make_inputs()

    result = compute_side_result_v1(liner, inputs)

    # durata ciclo
    assert result.derived.tMs == pytest.approx(1000.0)

    # ON = 600 ms (60%)
    assert result.derived.onMs == pytest.approx(600.0)

    # OFF = 400 ms
    assert result.derived.offMs == pytest.approx(400.0)

    # delta = 42 - 10
    assert result.derived.deltaKpa == pytest.approx(32.0)

    # real milking deve essere > 0
    assert result.derived.bRealMs > 0
    assert result.derived.realMilkingMs == result.derived.bRealMs

    # grafico ha 5 punti
    assert len(result.charts.pulsation.curve.points) == 5


def test_delta_full_cycle():
    # tpp >= max → delta <= 0 → full cycle
    liner = make_liner(tpp=50.0)
    inputs = make_inputs(max_kpa=40.0)

    result = compute_side_result_v1(liner, inputs)

    assert result.derived.bRealMs == pytest.approx(result.derived.tMs)
    assert "delta<=0" in result.warnings[0]


def test_delta_empty_cycle():
    # tpp <= 0 → delta >= max → zero window
    liner = make_liner(tpp=0.0)
    inputs = make_inputs(max_kpa=40.0)

    result = compute_side_result_v1(liner, inputs)

    assert result.derived.bRealMs == pytest.approx(0.0)
    assert "delta>=max" in result.warnings[0]


def test_clamp_behavior():
    liner = make_liner(tpp=39.9)
    inputs = make_inputs(max_kpa=40.0)

    result = compute_side_result_v1(liner, inputs)

    # bRealMs non deve mai superare tMs
    assert 0.0 <= result.derived.bRealMs <= result.derived.tMs
