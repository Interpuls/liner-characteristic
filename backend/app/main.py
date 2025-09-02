import os
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Query, Path
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select
import re
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from typing import Optional
from sqlalchemy.exc import IntegrityError
import json

#chiamiamo sa sqlalchemy per i vincoli  
import sqlalchemy as sa

from .db import init_db, get_session
from .models import User, Product, SearchPreference, KpiDef, FormulaType, ProductApplication, TppRun, TestMetric, KpiValue, KpiScale
from .schemas import UserCreate, UserOut, Token, ProductIn, ProductOut, ProductMetaOut, ProductPreferenceIn, ProductPreferenceOut, KpiDefIn, KpiDefOut, ProductApplicationIn, ProductApplicationOut, SIZE_LABELS, TppRunIn, TppRunOut, KpiScaleUpsertIn, KpiScaleBandIn, KpiValueOut
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors
from .services.kpi_engine import score_from_scales

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
    limit: int = Query(20, ge=1, le=100),
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

# List (tutti i ruoli)
@app.get("/kpis", response_model=list[KpiDefOut])
def list_kpis(session: Session = Depends(get_session), user=Depends(get_current_user)):
    return session.exec(select(KpiDef).order_by(KpiDef.created_at.asc())).all()

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