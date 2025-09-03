# app/scripts/seed_kpis.py
from datetime import datetime
import os
from dotenv import load_dotenv
from sqlmodel import Session, select

from app.db import engine
from app.models import KpiDef, FormulaType

load_dotenv()

print("[seed_kpis] DATABASE_URL =", os.getenv("DATABASE_URL"))
print("[seed_kpis] engine.url   =", str(engine.url))

# code, name, unit, test_type_code, description
KPI_LIST = [
    ("CLOSURE",             "Closure",             None,  "TPP",     "Closure KPI from Real TPP"),
    ("CONGESTION_RISK",     "Congestion Risk",     None,  "MASSAGE", "From Massage avg overmilk"),
    ("HYPERKERATOSIS_RISK", "Hyperkeratosis Risk", None,  "MASSAGE", "From Massage avg PF"),
    ("FITTING",             "Fitting",             None,  "MASSAGE", "From diff% vs VacMax"),
    ("SPEED",               "Speed",               "ml",  "WATER",   "Water after 1 minute"),
    ("RESPRAY",             "Respray",             None,  "SMT",     "From SMT (smt_max - 45)"),
    ("FLUIDODYNAMIC",       "Fluidodynamic",       None,  "SMT",     "From SMT piecewise"),
    ("SLIPPAGE",            "Slippage",            None,  "HOOD",    "From HOOD piecewise"),
    ("RINGING_RISK",        "Ringing Risk",        None,  "HOOD",    "From Hood max - 45"),
]

def main():
    with Session(engine) as s:
        for code, name, unit, test_type_code, desc in KPI_LIST:
            existing = s.exec(select(KpiDef).where(KpiDef.code == code)).first()
            if existing:
                continue

            obj = KpiDef(
                code=code,
                name=name,
                description=desc,
                test_type_code=test_type_code,   # <-- NOT NULL: valorizzato
                formula_type=FormulaType.SQL,
                formula_text="",
                inputs={},                 # dict/JSON vuoto
                weight=1.0,
                created_at=datetime.utcnow(),
            )
            s.add(obj)

        s.commit()
    print("KPI defs seeded.")

if __name__ == "__main__":
    main()
