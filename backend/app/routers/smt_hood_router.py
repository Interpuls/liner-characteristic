from datetime import datetime
from typing import Optional, List
import json
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlmodel import Session, select

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.kpi import KpiValue, TestMetric
from app.model.product import ProductApplication
from app.model.smthood import SmtHoodRun, SmtHoodPoint
from app.schema.smthood import SmtHoodRunOut, SmtHoodPointIn
from app.services.kpi_engine import score_from_scales, score_or_422

router = APIRouter()

# ----------------------------------------------------------------
# -------------------------- SMT/HOOD ----------------------------
# ----------------------------------------------------------------

ALLOWED_FLOWS = [0.5, 1.9, 3.6]
MILK_VAC = 45.0

#Converte flow_lpm in codice intero (es. 1.9 → 19)
def _flow_code(lpm: float) -> int:
    return int(round(lpm * 10))

#Normalizza il valore al più vicino tra quelli consentiti (0.5/1.9/3.6)
def _norm_flow(lpm: float) -> float:
    return min(ALLOWED_FLOWS, key=lambda f: abs(f - float(lpm)))

#Crea un nuovo SMT/HOOD run con i punti per diversi flow (0.5 / 1.9 / 3.6 L/min)
@router.post("/runs", response_model=dict)
def create_smt_hood_run(
    payload: dict = Body(...),
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    pa_id = payload.get("product_application_id")
    if not pa_id:
        raise HTTPException(status_code=400, detail="product_application_id required")

    pa = session.get(ProductApplication, pa_id)
    if not pa:
        raise HTTPException(status_code=404, detail="Product application not found")

    run = SmtHoodRun(
        product_application_id=pa_id,
        performed_at=payload.get("performed_at"),
        notes=payload.get("notes"),
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    pts = payload.get("points") or []
    by_flow = {}
    for p in pts:
        try:
            fl = _norm_flow(float(p["flow_lpm"]))
            code = _flow_code(fl)
            smt_min = float(p["smt_min"])
            smt_max = float(p["smt_max"])
            hood_min = float(p["hood_min"])
            hood_max = float(p["hood_max"])
        except Exception:
            continue

        if fl not in ALLOWED_FLOWS:
            continue
        if smt_max < smt_min or hood_max < hood_min:
            raise HTTPException(status_code=400, detail="max must be >= min for SMT and HOOD")

        by_flow[code] = (fl, smt_min, smt_max, hood_min, hood_max)

    for code, (fl, smt_min, smt_max, hood_min, hood_max) in by_flow.items():
        session.add(
            SmtHoodPoint(
                run_id=run.id,
                flow_code=code,
                flow_lpm=fl,
                smt_min=smt_min,
                smt_max=smt_max,
                hood_min=hood_min,
                hood_max=hood_max,
            )
        )
    session.commit()

    saved = session.exec(
        select(SmtHoodPoint)
        .where(SmtHoodPoint.run_id == run.id)
        .order_by(SmtHoodPoint.flow_code.asc())
    ).all()

    return {
        "id": run.id,
        "product_application_id": pa_id,
        "points": [
            {
                "flow_lpm": r.flow_lpm,
                "smt_min": r.smt_min,
                "smt_max": r.smt_max,
                "hood_min": r.hood_min,
                "hood_max": r.hood_max,
            }
            for r in saved
        ],
    }

#Aggiorna i punti SMT/HOOD per un determinato run
@router.put("/runs/{run_id}/points", response_model=dict)
def upsert_smt_hood_points(
    run_id: int = Path(..., ge=1),
    points: List[SmtHoodPointIn] = Body(...),
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(SmtHoodRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if not points:
        raise HTTPException(status_code=400, detail="At least one point is required")

    by_code = {}
    for p in points:
        fl = _norm_flow(float(p.flow_lpm))
        if fl not in ALLOWED_FLOWS:
            raise HTTPException(status_code=400, detail=f"flow_lpm must be one of {ALLOWED_FLOWS}")
        code = _flow_code(fl)
        smt_min = float(p.smt_min)
        smt_max = float(p.smt_max)
        hood_min = float(p.hood_min)
        hood_max = float(p.hood_max)
        if smt_max < smt_min or hood_max < hood_min:
            raise HTTPException(status_code=400, detail="max must be >= min for SMT and HOOD")
        by_code[code] = (fl, smt_min, smt_max, hood_min, hood_max)
    
    #upsert semplice: delete -> insert
    session.exec(sa.delete(SmtHoodPoint).where(SmtHoodPoint.run_id == run_id))
    for code, (fl, smt_min, smt_max, hood_min, hood_max) in by_code.items():
        session.add(
            SmtHoodPoint(
                run_id=run_id,
                flow_code=code,
                flow_lpm=fl,
                smt_min=smt_min,
                smt_max=smt_max,
                hood_min=hood_min,
                hood_max=hood_max,
            )
        )
    session.commit()

    saved = session.exec(
        select(SmtHoodPoint)
        .where(SmtHoodPoint.run_id == run_id)
        .order_by(SmtHoodPoint.flow_code.asc())
    ).all()

    return {
        "id": run_id,
        "points": [
            {
                "flow_lpm": r.flow_lpm,
                "smt_min": r.smt_min,
                "smt_max": r.smt_max,
                "hood_min": r.hood_min,
                "hood_max": r.hood_max,
            }
            for r in saved
        ],
    }

#Calcola i KPI derivati (RESPRAY, FLUYDODINAMIC, SLIPPAGE, RINGING_RISK)
# per un run SMT/HOOD
@router.post("/runs/{run_id}/compute", response_model=dict)
def compute_smt_hood_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(SmtHoodRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    #punti del run
    pts = session.exec(select(SmtHoodPoint).where(SmtHoodPoint.run_id == run_id)).all()
    by = {p.flow_code: p for p in pts}
    needed = [_flow_code(f) for f in ALLOWED_FLOWS]
    if not all(k in by for k in needed):
        raise HTTPException(status_code=400, detail="Run requires 3 points at flows 0.5, 1.9, 3.6 L/min")
    
    #pulizia metriche del run (idempotente)
    session.exec(sa.delete(TestMetric).where(TestMetric.run_type == "SMT_HOOD", TestMetric.run_id == run.id))
    session.commit()

    results = {}
    respray_vals, fluydo_vals, slippage_vals, ringing_vals = [], [], [], []

    # ---- per-flow: calcolo, scoring e persistenza metriche derivate ----
    for fl in ALLOWED_FLOWS:
        code = _flow_code(fl)
        p = by[code]

        smt_min, smt_max = float(p.smt_min), float(p.smt_max)
        hood_min, hood_max = float(p.hood_min), float(p.hood_max)

        # derivati (kPa)
        respray_val = smt_max - MILK_VAC
        fluydo_val = (smt_max - smt_min) - (smt_max - MILK_VAC) if smt_max > MILK_VAC else (smt_max - smt_min)
        slippage_val = (hood_max - hood_min) - (hood_max - MILK_VAC) if hood_max > MILK_VAC else (hood_max - hood_min)
        ringing_val = hood_max - MILK_VAC

        s_respray  = score_or_422(session, "RESPRAY",       respray_val)
        s_fluydo   = score_or_422(session, "FLUYDODINAMIC", fluydo_val)
        s_slippage = score_or_422(session, "SLIPPAGE",      slippage_val)
        s_ringing  = score_or_422(session, "RINGING_RISK",  ringing_val)

        # Salva metriche derivate
        def save_metric(code: str, value: float):
            session.add(
                TestMetric(
                    run_type="SMT_HOOD",
                    run_id=run.id,
                    product_application_id=run.product_application_id,
                    metric_code=code,
                    value_num=float(value),
                    unit="kPa",
                    context_json=json.dumps({"flow_lpm": fl}),
                )
            )

        save_metric("RESPRAY_VAL", respray_val)
        save_metric("FLUYDODINAMIC_VAL", fluydo_val)
        save_metric("SLIPPAGE_VAL", slippage_val)
        save_metric("RINGING_VAL", ringing_val)

        results[fl] = {
            "respray": {"value": respray_val, "score": s_respray},
            "fluydodinamic": {"value": fluydo_val, "score": s_fluydo},
            "slippage": {"value": slippage_val, "score": s_slippage},
            "ringing_risk": {"value": ringing_val, "score": s_ringing},
        }

        respray_vals.append(respray_val)
        fluydo_vals.append(fluydo_val)
        slippage_vals.append(slippage_val)
        ringing_vals.append(ringing_val)

    # ---- KPI finali (medie 3 flow) + upsert in kpi_values ----
    def _avg(xs: list[float]) -> float:
        return (sum(xs) / len(xs)) if xs else 0.0

    avg_respray, avg_fluydo, avg_slip, avg_ringing = (
        _avg(respray_vals),
        _avg(fluydo_vals),
        _avg(slippage_vals),
        _avg(ringing_vals),
    )

    def upsert_kpi(code: str, value: float, score: int, unit: str | None = "kPa"):
        ctx = json.dumps({"flows": ALLOWED_FLOWS, "agg": "final"})
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code,
            )
        ).first()
        if kv:
            kv.value_num, kv.score, kv.unit = float(value), int(score), unit
            kv.run_type, kv.run_id, kv.context_json = "SMT_HOOD", run.id, ctx
            session.add(kv)
        else:
            session.add(
                KpiValue(
                    product_application_id=run.product_application_id,
                    kpi_code=code,
                    value_num=float(value),
                    score=int(score),
                    run_type="SMT_HOOD",
                    run_id=run.id,
                    unit=unit,
                    context_json=ctx,
                )
            )

    upsert_kpi("RESPRAY",        avg_respray, score_or_422(session, "RESPRAY",       avg_respray))
    upsert_kpi("FLUYDODINAMIC",  avg_fluydo,  score_or_422(session, "FLUYDODINAMIC", avg_fluydo))
    upsert_kpi("SLIPPAGE",       avg_slip,    score_or_422(session, "SLIPPAGE",      avg_slip))
    upsert_kpi("RINGING_RISK",   avg_ringing, score_or_422(session, "RINGING_RISK",  avg_ringing))


    session.commit()

    def _r1(x: float) -> float:
        return float(f"{x:.1f}")

    return {
        "run_id": run.id,
        "product_application_id": run.product_application_id,
        "flows": results,
        "final": {
            "RESPRAY": {"value": _r1(avg_respray), "unit": "kPa"},
            "FLUYDODINAMIC": {"value": _r1(avg_fluydo), "unit": "kPa"},
            "SLIPPAGE": {"value": _r1(avg_slip), "unit": "kPa"},
            "RINGING_RISK": {"value": _r1(avg_ringing), "unit": "kPa"},
        },
    }


@router.get("/runs", response_model=List[SmtHoodRunOut])
def list_smt_hood_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    q = select(SmtHoodRun)
    if product_application_id:
        q = q.where(SmtHoodRun.product_application_id == product_application_id)
    q = q.order_by(SmtHoodRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()


@router.get("/runs/latest", response_model=dict)
def get_latest_smt_hood_run(
    product_application_id: int = Query(..., ge=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.exec(
        select(SmtHoodRun)
        .where(SmtHoodRun.product_application_id == product_application_id)
        .order_by(SmtHoodRun.created_at.desc())
        .limit(1)
    ).first()
    if not run:
        return {"run": None, "points": []}

    pts = session.exec(
        select(SmtHoodPoint)
        .where(SmtHoodPoint.run_id == run.id)
        .order_by(SmtHoodPoint.flow_code.asc())
    ).all()

    points_payload = [
        {
            "flow_lpm": p.flow_lpm,
            "smt_min": p.smt_min,
            "smt_max": p.smt_max,
            "hood_min": p.hood_min,
            "hood_max": p.hood_max,
        }
        for p in pts
    ]

    return {
        "run": {
            "id": run.id,
            "product_application_id": run.product_application_id,
            "performed_at": run.performed_at,
            "notes": run.notes,
            "created_at": run.created_at,
            "points": points_payload,
        },
        "points": points_payload,
    }
