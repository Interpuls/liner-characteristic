# app/scripts/seed_kpis.py
from datetime import datetime
import os
from dotenv import load_dotenv
from sqlmodel import Session, select, create_engine






load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

from app.models import KpiDef

print("[seed_kpis] DATABASE_URL =", os.getenv("DATABASE_URL"))
print("[seed_kpis] engine.url   =", str(engine.url))

# code, name, unit, test_type_code, description
KPI_LIST = [
    ("CLOSURE",             "Closure",             "TPP",     "Closure KPI from Real TPP"),
    ("CONGESTION_RISK",     "Congestion Risk",     "MASSAGE", "From Massage avg overmilk"),
    ("HYPERKERATOSIS_RISK", "Hyperkeratosis Risk", "MASSAGE", "From Massage avg PF"),
    ("FITTING",             "Fitting",             "MASSAGE", "From diff% vs VacMax"),
    ("SPEED",               "Speed",               "SPEED",   "Water after 1 minute"),
    ("RESPRAY",             "Respray",             "SMT_HOOD",     "From SMT (smt_max - 45)"),
    ("FLUYDODINAMIC",       "Fluydodinamic",       "SMT_HOOD",     "From SMT piecewise"),
    ("SLIPPAGE",            "Slippage",            "SMT_HOOD",    "From HOOD piecewise"),
    ("RINGING_RISK",        "Ringing Risk",        "SMT_HOOD",    "From Hood max - 45"),
]

def main():
    with Session(engine) as s:
        for code, name, test_type_code, desc in KPI_LIST:
            existing = s.exec(select(KpiDef).where(KpiDef.code == code)).first()
            if existing:
                continue

            obj = KpiDef(
                code=code,
                name=name,
                description=desc,
                test_type_code=test_type_code,   
                formula_type="SQL",
                formula_text="",
                inputs={},                 
                weight=1.0,
            )
            s.add(obj)

        s.commit()
    print("KPI defs seeded.")

if __name__ == "__main__":
    main()
