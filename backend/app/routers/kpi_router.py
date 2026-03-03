from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
import sqlalchemy as sa
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import require_role, get_current_user
from app.model.kpi import KpiDef, KpiScale, KpiValue
from app.schema.kpi import KpiDefIn, KpiDefOut, KpiScaleUpsertIn, KpiValuesBatchIn

router = APIRouter()


# ---------------------------------------------------------------------------
# ---------------------------- KPI DEF --------------------------------------
# ---------------------------------------------------------------------------

#Restituisce tutte le definizioni KPI ordinate per data di creazione
@router.get("/", response_model=list[KpiDefOut])
@convert_output
def list_kpis(session: Session = Depends(get_session), user=Depends(get_current_user)):
    rows = session.exec(
        select(KpiDef).order_by(KpiDef.created_at.asc())
    ).all()
    return rows

#Restituisce i KPI calcolati per una specifica product_application_id
@router.get("/values", response_model=list[dict])
@convert_output
def list_kpis_for_application(
    product_application_id: int = Query(..., ge=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    rows = session.exec(
        select(KpiValue)
        .where(KpiValue.product_application_id == product_application_id)
        .order_by(KpiValue.kpi_code.asc(), KpiValue.computed_at.desc())
    ).all()

    return [
        {
            "kpi_code": r.kpi_code,
            "value_num": r.value_num,
            "score": r.score,
            "run_type": r.run_type,
            "run_id": r.run_id,
            "unit": r.unit,
            "context": r.context_json,  #stringa JSON (parsed lato FE)
            "computed_at": r.computed_at,
        }
        for r in rows
    ]


@router.post("/values/batch", response_model=dict[str, list[dict]])
@convert_output
def list_kpis_for_applications_batch(
    payload: KpiValuesBatchIn,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    raw_ids = payload.product_application_ids or []
    deduped_ids = list(dict.fromkeys(int(x) for x in raw_ids if int(x) > 0))
    if not deduped_ids:
        return {}
    if len(deduped_ids) > 200:
        raise HTTPException(status_code=422, detail="Maximum 200 product_application_ids allowed")

    rows = session.exec(
        select(KpiValue)
        .where(KpiValue.product_application_id.in_(deduped_ids))
        .order_by(
            KpiValue.product_application_id.asc(),
            KpiValue.kpi_code.asc(),
            KpiValue.computed_at.desc(),
        )
    ).all()

    out: dict[str, list[dict]] = {str(i): [] for i in deduped_ids}
    for r in rows:
        out[str(r.product_application_id)].append(
            {
                "product_application_id": r.product_application_id,
                "kpi_code": r.kpi_code,
                "value_num": r.value_num,
                "score": r.score,
                "run_type": r.run_type,
                "run_id": r.run_id,
                "unit": r.unit,
                "context": r.context_json,
                "computed_at": r.computed_at,
            }
        )
    return out

#Crea o aggiorna una definizione KPI (upsert). Solo admin.
@router.post("/", response_model=KpiDefOut, dependencies=[Depends(require_role("admin"))])
def create_or_update_kpi(payload: KpiDefIn, session: Session = Depends(get_session)):
    existing = session.exec(select(KpiDef).where(KpiDef.code == payload.code)).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    item = KpiDef(**payload.dict())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

#Elimina una definizione KPI (solo admin).
@router.delete("/{kpi_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_kpi(kpi_id: int, session: Session = Depends(get_session)):
    item = session.get(KpiDef, kpi_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(item)
    session.commit()

#Aggiorna (upsert) le scale di un KPI. Solo admin.
@router.put("/{kpi_code}/scales", dependencies=[Depends(require_role("admin"))])
def upsert_kpi_scales(
    kpi_code: str,
    payload: KpiScaleUpsertIn,
    session: Session = Depends(get_session),
):
    #pulizia e reinserimento (semplice e idempotente)
    session.exec(sa.delete(KpiScale).where(KpiScale.kpi_code == kpi_code))
    objs = [
        KpiScale(
            kpi_code=kpi_code,
            band_min=band.band_min,
            band_max=band.band_max,
            score=band.score,
            label=band.label,
        )
        for band in payload.bands
    ]
    if objs:
        session.bulk_save_objects(objs)
    session.commit()
    return {"ok": True}

#Restituisce le scale di un KPI in formato compatibile con il frontend
@router.get("/{code}/scales")
@convert_output
def get_kpi_scales(
    code: str,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    bands = session.exec(
        select(KpiScale)
        .where(KpiScale.kpi_code == code)
        .order_by(KpiScale.band_min.asc(), KpiScale.band_max.asc())
    ).all()
    # normalizza output come quello che si aspetta il FE
    return {
        "bands": [
            {
                "band_min": float(b.band_min),
                "band_max": float(b.band_max),
                "score": int(b.score),
                "label": b.label or "",
            }
            for b in bands
        ]
    }
