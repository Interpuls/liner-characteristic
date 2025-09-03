import os
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Query, Path, Body
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, delete
from sqlmodel import Session, select
import re
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from typing import Optional, List
from sqlalchemy.exc import IntegrityError
import json

from datetime import datetime

#chiamiamo sa sqlalchemy per i vincoli  
import sqlalchemy as sa

from .db import init_db, get_session
from .models import User, Product, SearchPreference, KpiDef, FormulaType, ProductApplication, TppRun, TestMetric, KpiValue, KpiScale, MassageRun, MassagePoint, TestMetric, KpiValue
from .schemas import UserCreate, UserOut, Token, ProductIn, ProductOut, ProductMetaOut, ProductPreferenceIn, ProductPreferenceOut, KpiDefIn, KpiDefOut, ProductApplicationIn, ProductApplicationOut, SIZE_LABELS, TppRunIn, TppRunOut, KpiScaleUpsertIn, KpiScaleBandIn, KpiValueOut, MassageRunIn, MassageRunOut, KpiValueOut, MassagePointOut, MassagePointIn
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors
from .services.kpi_engine import score_from_scales, massage_compute_derivatives

ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "milkrite.com")

app = FastAPI(title="Liner Characteristic API")

logger = logging.getLogger("liner-backend")
logging.basicConfig(level=logging.INFO)



@app.on_event("startup")
def on_startup():
    init_db()

# -------------------------- Routes ----------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({"ok": True, "docs": "/docs", "health": "/healthz"})


# ------------------------- Middleware -------------------------------------------

def apply_cors(app):
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        # Fallback sicuro per dev; in prod dovresti valorizzare l'env
        origins = ["*"]
    print(f"[CORS] allow_origins={origins}")  

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],      
        allow_credentials=False,  
        expose_headers=["*"],
    )

app.add_middleware(GZipMiddleware, minimum_size=500)
apply_cors(app)

@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp


# --------------------------- Auth ----------------------------------------------

@app.post("/auth/register", response_model=UserOut)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    # consenti solo email del dominio aziendale
    if not payload.email.endswith(f"@{ALLOWED_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail="Email domain not allowed")

    exists = session.exec(select(User).where(User.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(email=payload.email, hashed_password=hash_password(payload.password), role=payload.role or "user")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.email, role=user.role)
    return Token(access_token=token)


# --------------------------- Users (me) ---------------------------------------

@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, role=user.role)


# ---------------------------- Health ------------------------------------------

@app.get("/healthz")
def healthz():
    return {"ok": True}


# ---------------------------- Products ----------------------------------------

# 3.a META: distinct values per i dropdown
@app.get("/products/meta", response_model=ProductMetaOut)
def products_meta(session: Session = Depends(get_session), user=Depends(get_current_user)):
    def distinct_list(col):
        rows = session.exec(select(func.distinct(col)).where(col.isnot(None))).all()
        return [r[0] if isinstance(r, tuple) else r for r in rows if r is not None]

    product_types = distinct_list(Product.product_type) or ["liner"]
    brands       = distinct_list(Product.brand)
    models       = distinct_list(Product.model)

    # se vuoi ancora esporre le misure disponibili:
    sizes = session.exec(
        select(func.distinct(ProductApplication.size_mm))
    ).all()
    teat_sizes = [
        int(s[0]) if isinstance(s, (tuple, list)) else int(s)
        for s in sizes if s is not None
    ]

    kpis = session.exec(select(KpiDef).order_by(KpiDef.created_at.asc())).all()

    return ProductMetaOut(
        product_types=product_types,
        brands=brands,
        models=models,
        teat_sizes=teat_sizes,  
        kpis=kpis
    )

# 3.b LIST con filtri base (senza KPI per ora)
@app.get("/products", response_model=list[ProductOut])
def list_products(
    session: Session = Depends(get_session), user=Depends(get_current_user),
    product_type: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    qy = select(Product)
    if product_type: qy = qy.where(Product.product_type == product_type)
    if brand:        qy = qy.where(Product.brand == brand)
    if model:        qy = qy.where(Product.model == model)
    if q:
        like = f"%{q}%"
        qy = qy.where(
            (Product.name.ilike(like)) | (Product.brand.ilike(like)) | (Product.model.ilike(like))
        )
    qy = qy.order_by(Product.created_at.desc()).limit(limit).offset(offset)
    return session.exec(qy).all()

# 3.c Preferenze (salvataggio/lettura per utente)
@app.get("/products/preferences", response_model=list[ProductPreferenceOut])
def list_prefs(session: Session = Depends(get_session), user=Depends(get_current_user)):
    q = select(SearchPreference).where(SearchPreference.user_id == user.id).order_by(SearchPreference.created_at.desc())
    return session.exec(q).all()

@app.post("/products/preferences", response_model=ProductPreferenceOut)
def save_pref(payload: ProductPreferenceIn, session: Session = Depends(get_session), user=Depends(get_current_user)):
    # upsert per nome (univoco per utente)
    existing = session.exec(
        select(SearchPreference).where(
            SearchPreference.user_id == user.id,
            SearchPreference.name == payload.name
        )
    ).first()
    if existing:
        existing.filters = payload.filters
        session.add(existing); session.commit(); session.refresh(existing)
        return existing
    pref = SearchPreference(user_id=user.id, name=payload.name, filters=payload.filters)
    session.add(pref); session.commit(); session.refresh(pref)
    return pref


def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'-{2,}', '-', s).strip('-')
    return s or "product"

@app.post("/products", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def create_product(payload: ProductIn, session: Session = Depends(get_session)):
    # 1) check duplicato (brand, model)
    exists_bm = session.exec(
        select(Product).where(Product.brand == payload.brand, Product.model == payload.model)
    ).first()
    if exists_bm:
        raise HTTPException(status_code=409, detail="Product with same brand and model already exists")

    # 2) genera code + name come prima
    code = payload.code or slugify(f"{payload.brand}-{payload.model}")
    base_code = code; i = 1
    while session.exec(select(Product).where(Product.code == code)).first():
        i += 1
        code = f"{base_code}-{i}"
    name = payload.name or payload.model

    # 3) crea prodotto + applications in un'unica transazione
    obj = Product(
        code=code,
        name=name,
        description=payload.description,
        product_type="liner",
        brand=payload.brand,
        model=payload.model,
        # specifiche tecniche
        mp_depth_mm=payload.mp_depth_mm,
        orifice_diameter=payload.orifice_diameter,
        hoodcup_diameter=payload.hoodcup_diameter,
        return_to_lockring=payload.return_to_lockring,
        lockring_diameter=payload.lockring_diameter,
        overall_length=payload.overall_length,
        milk_tube_id=payload.milk_tube_id,
        barrell_wall_thickness=payload.barrell_wall_thickness,
        barrell_conicity=payload.barrell_conicity,
        hardness=payload.hardness,
    )
    session.add(obj)
    try:
        # flush per avere obj.id senza chiudere la transazione
        session.flush()

        # 4) crea le 4 applications standard
        for size in (40, 50, 60, 70):
            session.add(ProductApplication(
                product_id=obj.id,
                size_mm=size,
                label=SIZE_LABELS[size],
            ))

        session.commit()         # unico commit per prodotto + applications
    except IntegrityError:
        session.rollback()
        # se è scattato il vincolo (brand,model) o (product_id,size_mm)
        # ritorna errore coerente
        raise HTTPException(status_code=409, detail="Product or applications already exist")
    session.refresh(obj)
    return obj


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj


@app.put("/products/{product_id}", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def update_product(product_id: int, payload: ProductIn, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")

    # Se cambiano brand+model, controlla il duplicato
    if (payload.brand is not None and payload.model is not None) and \
       (payload.brand != obj.brand or payload.model != obj.model):
        dup = session.exec(
            select(Product).where(
                Product.brand == payload.brand,
                Product.model == payload.model,
                Product.id != product_id,
            )
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="Product with same brand and model already exists")

    # --- NON sovrascrivere code/name con None ---
    # Cambia code SOLO se viene passato (e diverso) e rimane unico
    if payload.code is not None and payload.code != obj.code:
        exists = session.exec(select(Product).where(Product.code == payload.code)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product code already exists")
        obj.code = payload.code

    # Cambia name SOLO se viene passato; se non arriva, lo lasci com’è
    if payload.name is not None:
        obj.name = payload.name

    # Aggiorna gli altri campi (accettiamo anche None per azzerarli)
    if payload.brand is not None:  obj.brand = payload.brand
    if payload.model is not None:  obj.model = payload.model
    obj.description = payload.description

    obj.mp_depth_mm = payload.mp_depth_mm
    obj.orifice_diameter = payload.orifice_diameter
    obj.hoodcup_diameter = payload.hoodcup_diameter
    obj.return_to_lockring = payload.return_to_lockring
    obj.lockring_diameter = payload.lockring_diameter
    obj.overall_length = payload.overall_length
    obj.milk_tube_id = payload.milk_tube_id
    obj.barrell_wall_thickness = payload.barrell_wall_thickness
    obj.barrell_conicity = payload.barrell_conicity
    obj.hardness = payload.hardness

    try:
        session.add(obj)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Update violates unique constraints")
    session.refresh(obj)
    return obj


@app.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_product(product_id: int, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return

# ------------------------ Product Applications -------------------------------
@app.get("/products/{product_id}/applications",
         response_model=list[ProductApplicationOut])
def list_product_applications(
    product_id: int = Path(..., ge=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    prod = session.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    q = select(ProductApplication).where(ProductApplication.product_id == product_id) \
                                  .order_by(ProductApplication.size_mm.asc(),
                                            ProductApplication.created_at.asc())
    return session.exec(q).all()


# POST: crea una application per un prodotto
@app.post("/products/{product_id}/applications",
          response_model=ProductApplicationOut,
          dependencies=[Depends(require_role("admin"))])
def create_product_application(
    product_id: int,
    payload: ProductApplicationIn,
    session: Session = Depends(get_session),
):
    prod = session.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    app_obj = ProductApplication(
        product_id=product_id,
        size_mm=payload.size_mm,
        label=SIZE_LABELS[payload.size_mm] 
    )
    session.add(app_obj)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        # violazione dell'unicità (product_id, size_mm)
        raise HTTPException(status_code=409, detail="Application for this size already exists")
    session.refresh(app_obj)
    return app_obj


# DELETE: rimuove una application
@app.delete("/products/{product_id}/applications/{app_id}",
            status_code=204,
            dependencies=[Depends(require_role("admin"))])
def delete_product_application(
    product_id: int,
    app_id: int,
    session: Session = Depends(get_session),
):
    app_obj = session.get(ProductApplication, app_id)
    if not app_obj or app_obj.product_id != product_id:
        raise HTTPException(status_code=404, detail="Application not found")

    session.delete(app_obj)
    session.commit()
    return

# ---------------------------- KPI DEF --------------------------------------

@app.get("/kpis", response_model=list[KpiDefOut])
def list_kpis(session: Session = Depends(get_session), user=Depends(get_current_user)):
    rows = session.exec(
        select(KpiDef).order_by(KpiDef.created_at.asc())
    ).all()
    return rows

# GET /kpis?product_application_id=26
@app.get("/kpis/values", response_model=list[dict])
def list_kpis_for_application(
    product_application_id: int = Query(..., ge=1),
    session: Session = Depends(get_session),
    user = Depends(get_current_user),
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
            "context": r.context_json,  # è una stringa JSON; se vuoi, parse lato FE
            "computed_at": r.computed_at,
        }
        for r in rows
    ]

# Create/Upsert (solo admin)
@app.post("/kpis", response_model=KpiDefOut, dependencies=[Depends(require_role("admin"))])
def create_or_update_kpi(payload: KpiDefIn, session: Session = Depends(get_session)):
    existing = session.exec(select(KpiDef).where(KpiDef.code == payload.code)).first()
    if existing:
        for k, v in payload.dict().items():
            setattr(existing, k, v)
        session.add(existing); session.commit(); session.refresh(existing)
        return existing
    item = KpiDef(**payload.dict())
    session.add(item); session.commit(); session.refresh(item)
    return item

# Delete (solo admin)
@app.delete("/kpis/{kpi_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_kpi(kpi_id: int, session: Session = Depends(get_session)):
    item = session.get(KpiDef, kpi_id)
    if not item: raise HTTPException(status_code=404, detail="Not found")
    session.delete(item); session.commit()


# Upsert KPI Scales (solo admin)
@app.put("/kpis/{kpi_code}/scales")
def upsert_kpi_scales(kpi_code: str, payload: KpiScaleUpsertIn, session: Session = Depends(get_session), user=Depends(require_role("admin"))):
    # pulizia e reinserimento (semplice e idempotente)
    session.exec(sa.delete(KpiScale).where(KpiScale.kpi_code == kpi_code))
    for band in payload.bands:
        obj = KpiScale(
            kpi_code=kpi_code,
            band_min=band.band_min,
            band_max=band.band_max,
            score=band.score,
            label=band.label
        )
        session.add(obj)
    session.commit()
    return {"ok": True}

@app.get("/kpis/{code}/scales")
def get_kpi_scales(code: str, session: Session = Depends(get_session), user=Depends(get_current_user)):
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
            } for b in bands
        ]
    }


# ---------------------------- TPP Runs --------------------------------------
@app.post("/tpp/runs", response_model=TppRunOut)
def create_tpp_run(payload: TppRunIn, session: Session = Depends(get_session), user=Depends(require_role("admin"))):
    run = TppRun(
        product_application_id=payload.product_application_id,
        real_tpp=payload.real_tpp,
        performed_at=payload.performed_at,
        notes=payload.notes
    )
    session.add(run); session.commit(); session.refresh(run)
    return run

@app.post("/tpp/runs/{run_id}/compute", response_model=list[KpiValueOut])
def compute_tpp_kpis(run_id: int, session: Session = Depends(get_session), user=Depends(require_role("admin"))):
    run = session.get(TppRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.real_tpp is None:
        raise HTTPException(status_code=400, detail="Missing real_tpp")

    # 1) salva la metrica derivata (REAL_TPP) su test_metrics (upsert semplice: delete->insert)
    context = json.dumps({"agg":"final"})
    session.exec(sa.delete(TestMetric).where(
        (TestMetric.run_type=="TPP") & (TestMetric.run_id==run.id) &
        (TestMetric.metric_code=="REAL_TPP") & (TestMetric.context_json==context)
    ))
    session.add(TestMetric(
        run_type="TPP",
        run_id=run.id,
        product_application_id=run.product_application_id,
        metric_code="REAL_TPP",
        value_num=run.real_tpp,
        unit=None,
        context_json=context
    ))

    # 2) calcola KPI CLOSURE
    score = score_from_scales(session, "CLOSURE", run.real_tpp)

    session.exec(sa.delete(KpiValue).where(
        (KpiValue.run_type=="TPP") & (KpiValue.run_id==run.id) &
        (KpiValue.kpi_code=="CLOSURE") & (KpiValue.context_json==context)
    ))
    kv = KpiValue(
        run_type="TPP",
        run_id=run.id,
        product_application_id=run.product_application_id,
        kpi_code="CLOSURE",
        value_num=run.real_tpp,
        score=score,
        unit=None,
        context_json=context
    )
    session.add(kv)
    session.commit()

    return [KpiValueOut(
        kpi_code=kv.kpi_code, value_num=kv.value_num, score=kv.score,
        unit=kv.unit, context_json=kv.context_json, computed_at=kv.computed_at
    )]


@app.get("/tpp/runs", response_model=list[TppRunOut])
def list_tpp_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    q = select(TppRun)
    if product_application_id:
        q = q.where(TppRun.product_application_id == product_application_id)
    q = q.order_by(TppRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()


@app.get("/tpp/runs/{run_id}/kpis", response_model=list[KpiValueOut])
def get_tpp_run_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
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


@app.get("/tpp/last-run-by-application/{product_application_id}", response_model=Optional[TppRunOut])
def get_last_tpp_run_for_application(
    product_application_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    run = session.exec(
        select(TppRun)
        .where(TppRun.product_application_id == product_application_id)
        .order_by(TppRun.created_at.desc())
    ).first()
    return run


# ---------------------------- MASSAGE Runs --------------------------------------
def _score_from_scales(session: Session, kpi_code: str, value: float) -> int | None:
    # prende la band dove band_min <= value <= band_max (adiacenze incluse)
    bands = session.exec(
        select(KpiScale)
        .where(KpiScale.kpi_code == kpi_code)
        .order_by(KpiScale.band_min.asc(), KpiScale.band_max.asc())
    ).all()
    for b in bands:
        if value >= b.band_min and value <= b.band_max:
            return int(b.score)
    return None

def _score_or_422(session: Session, kpi_code: str, value: float) -> int:
    bands = session.exec(
        select(KpiScale)
        .where(KpiScale.kpi_code == kpi_code)
        .order_by(KpiScale.band_min.asc(), KpiScale.band_max.asc())
    ).all()
    for b in bands:
        if value >= b.band_min and value <= b.band_max:
            return int(b.score)
    raise HTTPException(
        status_code=422,
        detail=f"No scale band for KPI {kpi_code} covering value {value}"
    )

@app.post("/massage/runs", response_model=dict)
def create_massage_run(
    payload: dict = Body(...),  # { product_application_id, points:[{pressure_kpa,min_val,max_val}x3], notes? }
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
):
    pa_id = payload.get("product_application_id")
    if not pa_id:
        raise HTTPException(status_code=400, detail="product_application_id required")

    pa = session.get(ProductApplication, pa_id)
    if not pa:
        raise HTTPException(status_code=404, detail="Product application not found")

    run = MassageRun(product_application_id=pa_id,
                     performed_at=datetime.utcnow(),
                     notes=payload.get("notes"))
    session.add(run)
    session.commit(); session.refresh(run)

    pts = payload.get("points") or []
    # ci aspettiamo 3 pressioni: 45, 40, 35 (in qualsiasi ordine)
    by_p = {int(p["pressure_kpa"]): p for p in pts if "pressure_kpa" in p and "min_val" in p and "max_val" in p}
    for kpa in [45, 40, 35]:
        p = by_p.get(kpa)
        if not p:
            continue
        mp = MassagePoint(
            run_id=run.id,
            pressure_kpa=kpa,
            min_val=float(p["min_val"]),
            max_val=float(p["max_val"])
        )
        session.add(mp)

    session.commit()

    # ritorno run_id e i points salvati
    saved = session.exec(select(MassagePoint).where(MassagePoint.run_id == run.id).order_by(MassagePoint.pressure_kpa.desc())).all()
    return {
        "id": run.id,
        "product_application_id": pa_id,
        "points": [
            {"pressure_kpa": r.pressure_kpa, "min_val": r.min_val, "max_val": r.max_val}
            for r in saved
        ],
    }

@app.post("/massage/runs/{run_id}/compute", response_model=dict)
def compute_massage_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
):
    run = session.get(MassageRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    pts = session.exec(
        select(MassagePoint).where(MassagePoint.run_id == run_id)
    ).all()
    by = {p.pressure_kpa: p for p in pts}
    if not all(k in by for k in (45, 40, 35)):
        raise HTTPException(status_code=400, detail="Run requires 3 points at 45/40/35 kPa")

    # intensità per pressione = max-min
    I45 = by[45].max_val - by[45].min_val
    I40 = by[40].max_val - by[40].min_val
    I35 = by[35].max_val - by[35].min_val

    # derivati
    avg_overmilk = (I45 + I40) / 2.0              # per CONGESTION_RISK
    avg_pf       = (I40 + I35) / 2.0              # per HYPERKERATOSIS_RISK
    diff_from_max = 45.0 - by[45].max_val
    diff_pct      = (diff_from_max / 45.0) if 45.0 != 0 else 0.0   # per FITTING
    drop_45_to_40 = (I40 - I45) / I45 if I45 else 0.0
    drop_40_to_35 = (I35 - I40) / I40 if I40 else 0.0

    # KPI score da scale
    k_cong = _score_or_422(session, "CONGESTION_RISK",     avg_overmilk)
    k_hk   = _score_or_422(session, "HYPERKERATOSIS_RISK", avg_pf)
    k_fit  = _score_or_422(session, "FITTING",             diff_pct)

    # ----- PULIZIA METRICHE ESISTENTI PER QUESTO RUN (idempotente) -----
    session.exec(
        delete(TestMetric).where(
            TestMetric.run_type == "MASSAGE",
            TestMetric.run_id == run.id
        )
    )
    session.commit()

    # ----- SALVA DERIVATI in test_metrics (una riga per metrica) -----
    def _save_metric(code: str, value: float, unit: str | None = None, ctx: dict | None = None):
        session.add(TestMetric(
            run_type="MASSAGE",
            run_id=run.id,
            product_application_id=run.product_application_id,
            metric_code=code,
            value_num=float(value),
            unit=unit,
            # se su SQLite la colonna non è JSON vero, salviamo come stringa
            context_json=json.dumps(ctx or {}),
        ))

    _save_metric("I45", I45)
    _save_metric("I40", I40)
    _save_metric("I35", I35)
    _save_metric("AVG_OVERMILK", avg_overmilk)
    _save_metric("AVG_PF",       avg_pf)
    _save_metric("DIFF_FROM_MAX", diff_from_max, unit="kPa")
    _save_metric("DIFF_PCT",      diff_pct,      unit="%")
    _save_metric("DROP_45_40", drop_45_to_40, unit="%")
    _save_metric("DROP_40_35", drop_40_to_35, unit="%")

    session.commit()

    # ----- UPSERT KPI per la coppia product_application -----
    def upsert_kpi(code: str, value: float, score: int | None):
        vnum = float(value) if value is not None else 0.0
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code
            )
        ).first()
    
        ctx_payload = {"pressures": [45, 40, 35]}
        ctx_str = json.dumps(ctx_payload)   # <-- serializza SEMPRE per SQLite
    
        if kv:
            kv.value_num = vnum
            kv.score     = int(score) if score is not None else None
            kv.run_type  = "MASSAGE"
            kv.run_id    = run.id
            kv.unit      = None
            kv.context_json = ctx_str
            session.add(kv)
        else:
            obj = KpiValue(
                product_application_id=run.product_application_id,
                kpi_code=code,
                value_num=vnum,
                score=int(score) if score is not None else None,
                run_type="MASSAGE",
                run_id=run.id,
                unit=None,
                context_json=ctx_str,       
            )
            session.add(obj)

    upsert_kpi("CONGESTION_RISK",     avg_overmilk, k_cong)
    upsert_kpi("HYPERKERATOSIS_RISK", avg_pf,       k_hk)
    upsert_kpi("FITTING",             diff_pct,     k_fit)

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
        }
    }

@app.get("/massage/runs", response_model=list[MassageRunOut])
def list_massage_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    q = select(MassageRun)
    if product_application_id:
        q = q.where(MassageRun.product_application_id == product_application_id)
    q = q.order_by(MassageRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()

# GET /massage/runs/latest?product_application_id=26
@app.get("/massage/runs/latest", response_model=dict)
def get_latest_massage_run(
    product_application_id: int = Query(..., ge=1),
    session: Session = Depends(get_session),
    user = Depends(get_current_user),
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
            "points": points_payload,  # compat
        },
        "points": points_payload,       # comodo per il FE
    }

@app.put("/massage/runs/{run_id}/points", response_model=dict)
def upsert_massage_points(
    run_id: int = Path(..., ge=1),
    points: List[MassagePointIn] = Body(...),   # [{pressure_kpa,min_val,max_val}, ...]
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
):
    run = session.get(MassageRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if not points:
        raise HTTPException(status_code=400, detail="At least one point is required")
    # Normalizziamo per pressione (l’ultima voce con la stessa pressione vince)
    by_kpa = {}
    for p in points:
        kpa = int(p.pressure_kpa)
        if kpa not in (45, 40, 35):
            raise HTTPException(status_code=400, detail="pressure_kpa must be one of 45, 40, 35")
        by_kpa[kpa] = p  # override se duplicato
    # Upsert semplice: cancella i punti esistenti del run e reinserisci quelli passati
    session.exec(delete(MassagePoint).where(MassagePoint.run_id == run_id))
    for kpa, p in by_kpa.items():
        session.add(MassagePoint(
            run_id=run_id,
            pressure_kpa=kpa,
            min_val=float(p.min_val),
            max_val=float(p.max_val),
        ))
    session.commit()
    # risposta coerente col GET latest
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
        ]
    }