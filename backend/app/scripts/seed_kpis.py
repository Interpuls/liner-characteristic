# app/scripts/seed_kpis.py
from sqlmodel import Session, select
from app.db import engine
from app.models import KpiDef
from datetime import datetime

KPI_LIST = [
    ("CLOSURE", "Closure", None, "Closure KPI from Real TPP"),
    ("CONGESTION_RISK", "Congestion Risk", None, "From Massage avg overmilk"),
    ("HYPERKERATOSIS_RISK", "Hyperkeratosis Risk", None, "From Massage avg overmilk"),
    ("FITTING", "Fitting", None, "From diff% vs VacMax"),
    ("SPEED", "Speed", "ml", "Water after 1 minute"),
    ("RESPRAY", "Respray", None, "From SMT (smt_max - 45)"),
    ("FLUIDODYNAMIC", "Fluidodynamic", None, "From SMT piecewise"),
    ("SLIPPAGE", "Slippage", None, "From HOOD piecewise"),
    ("RINGING_RISK", "Ringing Risk", None, "From Hood max - 45"),
]

def main():
    with Session(engine) as s:
        for code, name, unit, desc in KPI_LIST:
            existing = s.exec(select(KpiDef).where(KpiDef.code == code)).first()
            if not existing:
                obj = KpiDef(code=code, name=name, unit=unit, description=desc, created_at=datetime.utcnow())
                s.add(obj)
        s.commit()
    print("KPI defs seeded.")

if __name__ == "__main__":
    main()
