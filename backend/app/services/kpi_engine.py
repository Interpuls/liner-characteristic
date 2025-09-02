# app/services/kpi_engine.py
from sqlmodel import Session, select
from app.models import KpiScale

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
