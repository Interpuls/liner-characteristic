# app/scripts/dedup_kpi_scales.py
from sqlmodel import Session, select
from collections import defaultdict
from app.db import engine
from app.models import KpiScale

with Session(engine) as s:
    rows = s.exec(select(KpiScale)).all()
    key = lambda r: (r.kpi_code, r.band_min, r.band_max)
    groups = defaultdict(list)
    for r in rows:
        groups[key(r)].append(r)
    to_delete = []
    for _, grp in groups.items():
        if len(grp) > 1:
            # tieni il più recente (o il primo) e cancella gli altri
            grp_sorted = sorted(grp, key=lambda r: r.id or 0, reverse=True)
            to_delete.extend(grp_sorted[1:])
    for r in to_delete:
        s.delete(r)
    s.commit()
print(f"Removed {len(to_delete)} duplicates")
