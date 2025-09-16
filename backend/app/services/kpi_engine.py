# app/services/kpi_engine.py
from sqlmodel import Session, select
from app.models import KpiScale
from typing import Dict, Tuple
import math

def score_from_scales(session: Session, kpi_code: str, value: float) -> int:
    bands = session.exec(
        select(KpiScale).where(KpiScale.kpi_code == kpi_code).order_by(KpiScale.band_min.asc())
    ).all()
    for b in bands:
        if value >= b.band_min and value < b.band_max:
            return int(b.score)
    # se fuori range, puoi decidere clamp o None; io clampo:
    if bands:
        if value < bands[0].band_min:  return int(bands[0].score)
        if value >= bands[-1].band_max: return int(bands[-1].score)
    return 0


def massage_compute_derivatives(points: Dict[int, Tuple[float, float]]):
    """
    points: {pressure: (min_val, max_val)}  pressure in {45,40,35}
    Ritorna dict con:
      INTENSITY_45/40/35, AVG_OVERMILK (mean intensities 45&40),
      AVG_MASSAGE_PF (mean intensities 40&35),
      VAC45_DIFF (45 - max_at_45), VAC45_DIFF_PCT,
      DROP_45to40, DROP_40to35  (percentuali di calo intensità)
    """
    def intensity(p):
        if p not in points: return None
        mn, mx = points[p]
        return mx - mn

    i45 = intensity(45)
    i40 = intensity(40)
    i35 = intensity(35)

    res = {
        "INTENSITY_45": i45,
        "INTENSITY_40": i40,
        "INTENSITY_35": i35,
        "AVG_OVERMILK": None,
        "AVG_MASSAGE_PF": None,
        "VAC45_DIFF": None,
        "VAC45_DIFF_PCT": None,
        "DROP_45to40": None,
        "DROP_40to35": None,
    }

    if i45 is not None and i40 is not None:
        res["AVG_OVERMILK"] = (i45 + i40) / 2.0
        # drop 45->40
        if i45 != 0:
            res["DROP_45to40"] = (i40 - i45) / i45

    if i40 is not None and i35 is not None:
        res["AVG_MASSAGE_PF"] = (i40 + i35) / 2.0
        # drop 40->35
        if i40 != 0:
            res["DROP_40to35"] = (i35 - i40) / i40

    if 45 in points:
        mn45, mx45 = points[45]
        vac_diff = 45 - mx45
        res["VAC45_DIFF"] = vac_diff
        res["VAC45_DIFF_PCT"] = vac_diff / 45.0

    return res


def speed_compute_derivatives(volumes: list[float]) -> dict:
    if not volumes:
        return {"avg_ml": None, "stdev_ml": None, "min_ml": None, "max_ml": None, "n": 0}
    n = len(volumes)
    avg = sum(volumes) / n
    var = sum((v - avg) ** 2 for v in volumes) / n
    stdev = var ** 0.5
    return {
        "avg_ml": avg,
        "stdev_ml": stdev,
        "min_ml": min(volumes),
        "max_ml": max(volumes),
        "n": n,
    }
