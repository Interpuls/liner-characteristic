from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import Optional
import sqlalchemy as sa
import json
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.kpi import KpiScale, KpiValue, TestMetric
from app.model.tpp import TppRun
from app.schema.kpi import KpiValueOut
from app.schema.tpp import TppRunIn, TppRunOut

from app.services.kpi_engine import score_from_scales

router = APIRouter()


# ---------------------------------------------------------------------------
# ---------------------------- TPP Runs -------------------------------------
# ---------------------------------------------------------------------------

#Crea un nuovo TPP run per una specifica Product Application
@router.post("/runs", response_model=TppRunOut)
@convert_output
def create_tpp_run(
    payload: TppRunIn,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = TppRun(
        product_application_id=payload.product_application_id,
        real_tpp=payload.real_tpp,
        performed_at=payload.performed_at,
        notes=payload.notes,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


# ---------------------------------------------------------------------------
# ---------------------------- Compute KPIs ---------------------------------
# ---------------------------------------------------------------------------

#Calcola e salva i KPI per un TPP run specifico
@router.post("/runs/{run_id}/compute", response_model=list[KpiValueOut])
@convert_output
def compute_tpp_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_role("admin")),
):
    run = session.get(TppRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.real_tpp is None:
        raise HTTPException(status_code=400, detail="Missing real_tpp")

    #salva la metrica derivata (REAL_TPP) su test_metrics (upsert semplice: delete->insert)

    context = json.dumps({"agg": "final"})

    #elimina eventuali metriche precedenti per idempotenza
    session.exec(sa.delete(TestMetric).where(
        (TestMetric.run_type == "TPP")
        & (TestMetric.run_id == run.id)
        & (TestMetric.metric_code == "REAL_TPP")
        & (TestMetric.context_json == context)
    ))

    #salva metrica derivata (REAL_TPP)
    session.add(TestMetric(
        run_type="TPP",
        run_id=run.id,
        product_application_id=run.product_application_id,
        metric_code="REAL_TPP",
        value_num=run.real_tpp,
        unit=None,
        context_json=context,
    ))

    #calcola KPI "CLOSURE"
    score = score_from_scales(session, "CLOSURE", run.real_tpp)

    #rimuovi vecchi valori KPI per questo run
    session.exec(sa.delete(KpiValue).where(
        (KpiValue.run_type == "TPP")
        & (KpiValue.run_id == run.id)
        & (KpiValue.kpi_code == "CLOSURE")
        & (KpiValue.context_json == context)
    ))

    #salva il nuovo valore KPI
    kv = KpiValue(
        run_type="TPP",
        run_id=run.id,
        product_application_id=run.product_application_id,
        kpi_code="CLOSURE",
        value_num=run.real_tpp,
        score=score,
        unit=None,
        context_json=context,
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


# ---------------------------------------------------------------------------
# --------------------------- LIST / RETRIEVE -------------------------------
# ---------------------------------------------------------------------------

#Restituisce tutti i run TPP, con filtro per product_application_id
@router.get("/runs", response_model=list[TppRunOut])
@convert_output
def list_tpp_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    q = select(TppRun).options(selectinload(TppRun.product_application))
    if product_application_id:
        q = q.where(TppRun.product_application_id == product_application_id)
    q = q.order_by(TppRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()

#Restituisce i KPI calcolati per un run TPP specifico
@router.get("/runs/{run_id}/kpis", response_model=list[KpiValueOut])
@convert_output
def get_tpp_run_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.get(TppRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    rows = session.exec(
        select(KpiValue)
        .where((KpiValue.run_type == "TPP") & (KpiValue.run_id == run_id))
        .order_by(KpiValue.computed_at.desc())
    ).all()
    return rows

#Restituisce l'ultimo run TPP per una determinata Product Application
@router.get("/last-run-by-application/{product_application_id}", response_model=Optional[TppRunOut])
@convert_output
def get_last_tpp_run_for_application(
    product_application_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    run = session.exec(
        select(TppRun)
        .where(TppRun.product_application_id == product_application_id)
        .order_by(TppRun.created_at.desc())
    ).first()
    return run
