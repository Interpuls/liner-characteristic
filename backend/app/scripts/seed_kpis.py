# app/scripts/seed_kpis.py
from datetime import datetime
import os
from dotenv import load_dotenv
from sqlmodel import Session, select, create_engine






load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

# Correct imports from kpi model and enums
from app.model.kpi import KpiDef
from app.common.enums import FormulaType, TestKind

print("[seed_kpis] DATABASE_URL =", os.getenv("DATABASE_URL"))
print("[seed_kpis] engine.url   =", str(engine.url))

# code, name, test_type_code, description
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
    created, skipped, updated = 0, 0, 0
    with Session(engine) as s:
        for code, name, test_type_code, desc in KPI_LIST:
            # normalize enum values
            try:
                tt = TestKind(test_type_code)
            except Exception:
                tt = TestKind[test_type_code] if test_type_code in TestKind.__members__ else TestKind.MASSAGE

            existing = s.exec(select(KpiDef).where(KpiDef.code == code)).first()
            if existing:
                # keep idempotent; update name/desc/test_type if changed
                changed = False
                if existing.name != name:
                    existing.name = name; changed = True
                if existing.description != desc:
                    existing.description = desc; changed = True
                if str(existing.test_type_code) != str(tt):
                    existing.test_type_code = tt; changed = True
                if changed:
                    s.add(existing); updated += 1
                else:
                    skipped += 1
                continue

                
            obj = KpiDef(
                code=code,
                name=name,
                description=desc,
                test_type_code=tt,
                formula_type=FormulaType.SQL,
                formula_text="",
                inputs={},
                weight=1.0,
            )
            s.add(obj)
            created += 1

        s.commit()
    print(f"KPI defs seeded. created={created}, updated={updated}, skipped={skipped}")
 
if __name__ == "__main__":
    main()
