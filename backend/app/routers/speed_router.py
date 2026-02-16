from typing import Optional, List
import json
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.kpi import KpiValue, TestMetric
from app.model.speed import SpeedRun
from app.schema.speed import SpeedRunIn, SpeedRunOut
from app.schema.kpi import KpiValueOut
from app.services.kpi_engine import score_from_scales

router = APIRouter()

# ----------------------------------------------------------------
# -------------------------- SPEED TEST --------------------------
# ----------------------------------------------------------------

#Crea un nuovo run SPEED con le misurazioni di portata
@router.post("/runs", response_model=SpeedRunOut)
def create_speed_run(
    payload: SpeedRunIn,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = SpeedRun(
        product_application_id=payload.product_application_id,
        measure_ml=payload.measure_ml,
        performed_at=payload.performed_at,
        notes=payload.notes,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run

#Calcola il KPI SPEED per il run specificato
@router.post("/runs/{run_id}/compute", response_model=List[KpiValueOut])
def compute_speed_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(SpeedRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.measure_ml is None:
        raise HTTPException(status_code=400, detail="Missing measure_ml")

    context = json.dumps({"agg": "final"})

    # 1) Cancella eventuali metriche duplicate e inserisci la metrica derivata
    session.exec(sa.delete(TestMetric).where(
        (TestMetric.run_type == "SPEED") &
        (TestMetric.run_id == run.id) &
        (TestMetric.metric_code == "SPEED_ML") &
        (TestMetric.context_json == context)
    ))

    session.add(TestMetric(
        run_type="SPEED",
        run_id=run.id,
        product_application_id=run.product_application_id,
        metric_code="SPEED_ML",
        value_num=run.measure_ml,
        unit="ml",
        context_json=context
    ))

    #Calcola KPI SPEED
    score = score_from_scales(session, "SPEED", run.measure_ml)

    #Pulisce ed aggiorna KpiValue
    session.exec(sa.delete(KpiValue).where(
        (KpiValue.run_type == "SPEED") &
        (KpiValue.run_id == run.id) &
        (KpiValue.kpi_code == "SPEED") &
        (KpiValue.context_json == context)
    ))

    kv = KpiValue(
        run_type="SPEED",
        run_id=run.id,
        product_application_id=run.product_application_id,
        kpi_code="SPEED",
        value_num=run.measure_ml,
        score=score,
        unit="ml",
        context_json=context
    )

    session.add(kv)
    session.commit()

    return [
        KpiValueOut(
            kpi_code=kv.kpi_code,
            value_num=kv.value_num,
            score=kv.score,
            unit=kv.unit,
            context_json=kv.context_json,
            computed_at=kv.computed_at,
        )
    ]

#Restituisce la lista dei run SPEED
@router.get("/runs", response_model=List[SpeedRunOut])
@convert_output
def list_speed_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    q = select(SpeedRun).options(selectinload(SpeedRun.product_application))
    if product_application_id:
        q = q.where(SpeedRun.product_application_id == product_application_id)
    q = q.order_by(SpeedRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()

#Restituisce i KPI calcolati per un run SPEED specifico
@router.get("/runs/{run_id}/kpis", response_model=List[KpiValueOut])
@convert_output
def get_speed_run_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.get(SpeedRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    rows = session.exec(
        select(KpiValue)
        .where((KpiValue.run_type == "SPEED") & (KpiValue.run_id == run_id))
        .order_by(KpiValue.computed_at.desc())
    ).all()
    return rows

#Restituisce l’ultimo run SPEED per una determinata application
@router.get("/last-run-by-application/{product_application_id}", response_model=Optional[SpeedRunOut])
@convert_output
def get_last_speed_run_for_application(
    product_application_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.exec(
        select(SpeedRun)
        .where(SpeedRun.product_application_id == product_application_id)
        .order_by(SpeedRun.created_at.desc())
    ).first()
    return run
