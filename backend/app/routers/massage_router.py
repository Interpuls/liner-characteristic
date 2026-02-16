from datetime import datetime
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlmodel import Session, select, delete
from sqlalchemy.orm import selectinload
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.kpi import KpiValue, TestMetric
from app.model.product import ProductApplication
from app.model.massage import MassageRun, MassagePoint
from app.schema.massage import MassageRunOut, MassagePointIn
from app.services.kpi_engine import score_or_422

router = APIRouter()

# ---------------------------------------------------------------------------
# ------------------------- CREATE MASSAGE RUN ------------------------------
# ---------------------------------------------------------------------------
#Crea un nuovo run MASSAGE con i punti a diverse pressioni (45, 40, 35 kPa)
@router.post("/runs", response_model=dict)
def create_massage_run(
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

    run = MassageRun(
        product_application_id=pa_id,
        performed_at=datetime.utcnow(),
        notes=payload.get("notes"),
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    #Inserisci i punti (pressioni 45, 40, 35)
    pts = payload.get("points") or []
    by_p = {
        int(p["pressure_kpa"]): p
        for p in pts
        if "pressure_kpa" in p and "min_val" in p and "max_val" in p
    }
    points_to_save = []
    for kpa in [45, 40, 35]:
        p = by_p.get(kpa)
        if not p:
            continue
        points_to_save.append(
            MassagePoint(
                run_id=run.id,
                pressure_kpa=kpa,
                min_val=float(p["min_val"]),
                max_val=float(p["max_val"]),
            )
        )
    if points_to_save:
        session.bulk_save_objects(points_to_save)

    session.commit()

    saved = session.exec(
        select(MassagePoint)
        .where(MassagePoint.run_id == run.id)
        .order_by(MassagePoint.pressure_kpa.desc())
    ).all()

    return {
        "id": run.id,
        "product_application_id": pa_id,
        "points": [
            {"pressure_kpa": r.pressure_kpa, "min_val": r.min_val, "max_val": r.max_val}
            for r in saved
        ],
    }


# ---------------------------------------------------------------------------
# ---------------------------- COMPUTE KPIS ---------------------------------
# ---------------------------------------------------------------------------

#Calcola le metriche e i KPI (CONGESTION_RISK, HYPERKERATOSIS_RISK, FITTING)
#per un run MASSAGE
@router.post("/runs/{run_id}/compute", response_model=dict)
def compute_massage_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(MassageRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    pts = session.exec(select(MassagePoint).where(MassagePoint.run_id == run_id)).all()
    by = {p.pressure_kpa: p for p in pts}
    if not all(k in by for k in (45, 40, 35)):
        raise HTTPException(status_code=400, detail="Run requires 3 points at 45/40/35 kPa")

    #intensità per pressione
    I45 = by[45].max_val - by[45].min_val
    I40 = by[40].max_val - by[40].min_val
    I35 = by[35].max_val - by[35].min_val

    #derivati
    avg_overmilk = (I45 + I40) / 2.0
    avg_pf = (I40 + I35) / 2.0
    diff_from_max = 45.0 - by[45].max_val
    diff_pct = (diff_from_max / 45.0) if 45.0 != 0 else 0.0
    drop_45_to_40 = (I40 - I45) / I45 if I45 else 0.0
    drop_40_to_35 = (I35 - I40) / I40 if I40 else 0.0

    #KPI score
    k_cong = score_or_422(session, "CONGESTION_RISK", avg_overmilk)
    k_hk = score_or_422(session, "HYPERKERATOSIS_RISK", avg_overmilk)
    k_fit = score_or_422(session, "FITTING", diff_pct)

    #Pulisci metriche esistenti (idempotente)
    session.exec(delete(TestMetric).where(TestMetric.run_type == "MASSAGE", TestMetric.run_id == run.id))
    session.commit()

    # Salva metriche derivate in batch
    metrics = [
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I45", value_num=float(I45), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I40", value_num=float(I40), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I35", value_num=float(I35), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="AVG_OVERMILK", value_num=float(avg_overmilk), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="AVG_PF", value_num=float(avg_pf), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DIFF_FROM_MAX", value_num=float(diff_from_max), unit="kPa", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DIFF_PCT", value_num=float(diff_pct), unit="%", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DROP_45_40", value_num=float(drop_45_to_40), unit="%", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DROP_40_35", value_num=float(drop_40_to_35), unit="%", context_json=json.dumps({})),
    ]
    session.bulk_save_objects(metrics)

    session.commit()

    #Upsert KPI
    def upsert_kpi(code: str, value: float, score: int | None):
        ctx = json.dumps({"pressures": [45, 40, 35]})
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code,
            )
        ).first()
        if kv:
            kv.value_num = float(value)
            kv.score = int(score) if score is not None else None
            kv.run_type = "MASSAGE"
            kv.run_id = run.id
            kv.context_json = ctx
            session.add(kv)
        else:
            session.add(
                KpiValue(
                    product_application_id=run.product_application_id,
                    kpi_code=code,
                    value_num=float(value),
                    score=int(score) if score is not None else None,
                    run_type="MASSAGE",
                    run_id=run.id,
                    context_json=ctx,
                )
            )

    upsert_kpi("CONGESTION_RISK", avg_overmilk, k_cong)
    upsert_kpi("HYPERKERATOSIS_RISK", avg_overmilk, k_hk)
    upsert_kpi("FITTING", diff_pct, k_fit)

    session.commit()

    return {
        "run_id": run.id,
        "product_application_id": run.product_application_id,
        "metrics": {
            "I45": I45, "I40": I40, "I35": I35,
            "avg_overmilk": avg_overmilk,
            "avg_pf": avg_pf,
            "diff_from_max": diff_from_max,
            "diff_pct": diff_pct,
            "drop_45_to_40": drop_45_to_40,
            "drop_40_to_35": drop_40_to_35,
        },
        "kpis": {
            "CONGESTION_RISK": k_cong,
            "HYPERKERATOSIS_RISK": k_hk,
            "FITTING": k_fit,
        },
    }


# ---------------------------------------------------------------------------
# ---------------------------- LIST / GET -----------------------------------
# ---------------------------------------------------------------------------

@router.get("/runs", response_model=List[MassageRunOut])
@convert_output
def list_massage_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    q = select(MassageRun).options(selectinload(MassageRun.product_application))
    if product_application_id:
        q = q.where(MassageRun.product_application_id == product_application_id)
    q = q.order_by(MassageRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()


@router.get("/runs/latest", response_model=dict)
@convert_output
def get_latest_massage_run(
    product_application_id: int = Query(..., ge=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.exec(
        select(MassageRun)
        .where(MassageRun.product_application_id == product_application_id)
        .order_by(MassageRun.created_at.desc())
        .limit(1)
    ).first()
    if not run:
        return {"run": None, "points": []}

    pts = session.exec(
        select(MassagePoint)
        .where(MassagePoint.run_id == run.id)
        .order_by(MassagePoint.pressure_kpa.desc())
    ).all()

    points_payload = [
        {"pressure_kpa": p.pressure_kpa, "min_val": p.min_val, "max_val": p.max_val}
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


@router.put("/runs/{run_id}/points", response_model=dict)
def upsert_massage_points(
    run_id: int = Path(..., ge=1),
    points: List[MassagePointIn] = Body(...),
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(MassageRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if not points:
        raise HTTPException(status_code=400, detail="At least one point is required")
    
    #Normalizziamo per pressione (l’ultima voce con la stessa pressione vince)
    by_kpa = {}
    for p in points:
        kpa = int(p.pressure_kpa)
        if kpa not in (45, 40, 35):
            raise HTTPException(status_code=400, detail="pressure_kpa must be one of 45, 40, 35")
        by_kpa[kpa] = p
    #Upsert semplice: cancella i punti esistenti del run e reinserisci quelli passati
    session.exec(delete(MassagePoint).where(MassagePoint.run_id == run_id))
    pts_to_save = [
        MassagePoint(
            run_id=run_id,
            pressure_kpa=kpa,
            min_val=float(p.min_val),
            max_val=float(p.max_val),
        )
        for kpa, p in by_kpa.items()
    ]
    if pts_to_save:
        session.bulk_save_objects(pts_to_save)
    session.commit()
    #risposta coerente col GET latest
    saved = session.exec(
        select(MassagePoint)
        .where(MassagePoint.run_id == run_id)
        .order_by(MassagePoint.pressure_kpa.desc())
    ).all()
    return {
        "id": run_id,
        "points": [
            {"pressure_kpa": r.pressure_kpa, "min_val": r.min_val, "max_val": r.max_val}
            for r in saved
        ],
    }
