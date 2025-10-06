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
from .models import Product, SearchPreference, KpiDef, FormulaType, ProductApplication, TppRun, TestMetric, KpiValue, KpiScale, MassageRun, MassagePoint, TestMetric, KpiValue, SpeedRun, SmtHoodRun, SmtHoodPoint
from .schemas import Token, ProductIn, ProductOut, ProductMetaOut, ProductPreferenceIn, ProductPreferenceOut, KpiDefIn, KpiDefOut, ProductApplicationIn, ProductApplicationOut, SIZE_LABELS, TppRunIn, TppRunOut, KpiScaleUpsertIn, KpiScaleBandIn, KpiValueOut, MassageRunIn, MassageRunOut, KpiValueOut, MassagePointOut, MassagePointIn, SpeedRunIn, SpeedRunOut, SmtHoodPointIn, SmtHoodPointOut, SmtHoodRunIn, SmtHoodRunOut
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors
from .services.kpi_engine import score_from_scales, massage_compute_derivatives

#nuovi import
from .model.user import User
from .schema.user import UserCreate, UserRead


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

@app.post("/auth/register", response_model=UserRead)
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

@app.get("/me", response_model=UserRead)
def me(user=Depends(get_current_user)):
    return user


# ---------------------------- Health ------------------------------------------

@app.get("/healthz")
def healthz():
    return {"ok": True}


# ------------------------------------------------------------------------------
# ---------------------------- PRODUCTS ----------------------------------------
# ------------------------------------------------------------------------------

# 3.a META: distinct values per i dropdown
@app.get("/products/meta", response_model=ProductMetaOut)
def products_meta(session: Session = Depends(get_session), user=Depends(get_current_user)):
    def distinct_list(col):
        rows = session.exec(select(func.distinct(col)).where(col.isnot(None))).all()
        return [r[0] if isinstance(r, tuple) else r for r in rows if r is not None]

    product_types = distinct_list(Product.product_type) or ["liner"]
    brands       = distinct_list(Product.brand)
    models       = distinct_list(Product.model)
    compounds    = distinct_list(Product.compound)  # <--- NEW

    sizes = session.exec(select(func.distinct(ProductApplication.size_mm))).all()
    teat_sizes = [int(s[0]) if isinstance(s, (tuple, list)) else int(s) for s in sizes if s is not None]

    kpis = session.exec(select(KpiDef).order_by(KpiDef.created_at.asc())).all()

    return ProductMetaOut(
        product_types=product_types,
        brands=brands,
        models=models,
        compounds=compounds,          
        teat_sizes=teat_sizes,
        kpis=kpis
    )

# 3.b LIST con filtri base (senza KPI per ora)
@app.get("/products", response_model=list[ProductOut])
def list_products(
    session: Session = Depends(get_session), 
    user=Depends(get_current_user),
    product_type: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    compound: Optional[str] = Query(None),       
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    qy = select(Product)
    if product_type: qy = qy.where(Product.product_type == product_type)
    if brand:        qy = qy.where(Product.brand == brand)
    if model:        qy = qy.where(Product.model == model)
    if compound:     qy = qy.where(Product.compound == _norm_compound(compound))  
    if q:
        like = f"%{q}%"
        qy = qy.where(
            (Product.name.ilike(like)) |
            (Product.brand.ilike(like)) |
            (Product.model.ilike(like)) |
            (Product.compound.ilike(like))  
        )

    is_admin = getattr(user, "role", "") == "admin"
    if not is_admin:
        qy = qy.where(Product.only_admin == False)

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


def _norm_compound(x: str | None) -> str:
    return (x or "STD").strip().upper()

def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "product"

@app.post("/products", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def create_product(payload: ProductIn, session: Session = Depends(get_session)):
    brand = (payload.brand or "").strip()
    model = (payload.model or "").strip()
    compound = _norm_compound(payload.compound)
    only_admin = True if payload.only_admin is None else bool(payload.only_admin)

    # 1) unicità (brand, model, compound)
    dup = session.exec(
        select(Product).where(
            Product.brand == brand,
            Product.model == model,
            Product.compound == compound,
        )
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")

    try:
        # 2) se questa nasce pubblica => demoto eventuali altre pubbliche di stesso brand/model
        if not only_admin:
            session.exec(
                sa.update(Product)
                .where(
                    Product.brand == brand,
                    Product.model == model,
                    Product.only_admin == sa.false(),
                )
                .values(only_admin=True)
            )

        # 3) code univoco
        base_code = payload.code or _slugify(f"{brand}-{model}-{compound}")
        code = base_code
        i = 1
        while session.exec(select(Product).where(Product.code == code)).first():
            i += 1
            code = f"{base_code}-{i}"

        obj = Product(
            code=code,
            name=payload.name or model or code,
            description=payload.description,
            product_type="liner",
            brand=brand,
            model=model,
            compound=compound,
            only_admin=only_admin,
            notes=payload.notes,
            manufactured_at=payload.manufactured_at,
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
        session.flush()  # vogliamo obj.id per le applications

        # 4) crea le 4 application standard
        for size in (40, 50, 60, 70):
            session.add(ProductApplication(
                product_id=obj.id,
                size_mm=size,
                label=SIZE_LABELS[size],
            ))

        session.commit()
        session.refresh(obj)
        return obj

    except IntegrityError as e:
        session.rollback()
        # facciamo propagare messaggi utili
        msg = str(getattr(e, "orig", e))
        if "ux_products_brand_model_compound" in msg:
            raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")
        raise HTTPException(status_code=409, detail="Could not create product")
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Could not create product")


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
        raise HTTPException(status_code=404, detail="Product not found")

    # nuovi valori candidati (se non passati, mantieni gli attuali)
    new_brand = (payload.brand if payload.brand is not None else obj.brand) or ""
    new_model = (payload.model if payload.model is not None else obj.model) or ""
    new_compound = _norm_compound(payload.compound if payload.compound is not None else obj.compound)
    new_only_admin = obj.only_admin if payload.only_admin is None else bool(payload.only_admin)

    # unicità (brand,model,compound) escludendo se stesso
    dup = session.exec(
        select(Product).where(
            Product.id != product_id,
            Product.brand == new_brand,
            Product.model == new_model,
            Product.compound == new_compound,
        )
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")

    try:
        # se questa diventa pubblica => demoto eventuali altre pubbliche stesso brand/model
        if new_only_admin is False:
            session.exec(
                sa.update(Product)
                .where(
                    Product.id != product_id,
                    Product.brand == new_brand,
                    Product.model == new_model,
                    Product.only_admin == sa.false(),
                )
                .values(only_admin=True)
            )

        # applica patch
        if payload.code is not None and payload.code != obj.code:
            # assicurati code univoco
            exists = session.exec(select(Product).where(Product.code == payload.code)).first()
            if exists:
                raise HTTPException(status_code=400, detail="Product code already exists")
            obj.code = payload.code
        if payload.name is not None: obj.name = payload.name
        obj.brand = new_brand
        obj.model = new_model
        obj.compound = new_compound
        if payload.description is not None: obj.description = payload.description
        obj.only_admin = new_only_admin
        obj.notes = payload.notes if payload.notes is not None else obj.notes
        obj.manufactured_at = payload.manufactured_at if payload.manufactured_at is not None else obj.manufactured_at

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

        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    except IntegrityError as e:
        session.rollback()
        msg = str(getattr(e, "orig", e))
        if "ux_products_brand_model_compound" in msg:
            raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")
        raise HTTPException(status_code=409, detail="Update violates unique constraints")
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Could not update product")


@app.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_product(product_id: int, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return

# -----------------------------------------------------------------------------
# ------------------------ PRODUCT APPLICATIONS -------------------------------
# -----------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# ---------------------------- KPI DEF --------------------------------------
# ---------------------------------------------------------------------------

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


# --------------------------------------------------------------------------------
# ---------------------------- MASSAGE Runs --------------------------------------
# --------------------------------------------------------------------------------

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
    avg_overmilk = (I45 + I40) / 2.0              # per CONGESTION_RISK e HYPERKERATOSIS_RISK
    avg_pf       = (I40 + I35) / 2.0              # per HYPERKERATOSIS_RISK (? da chiedere ad Alle)
    diff_from_max = 45.0 - by[45].max_val
    diff_pct      = (diff_from_max / 45.0) if 45.0 != 0 else 0.0   # per FITTING
    drop_45_to_40 = (I40 - I45) / I45 if I45 else 0.0
    drop_40_to_35 = (I35 - I40) / I40 if I40 else 0.0

    # KPI score da scale
    k_cong = _score_or_422(session, "CONGESTION_RISK",     avg_overmilk)
    k_hk   = _score_or_422(session, "HYPERKERATOSIS_RISK", avg_overmilk)
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
    upsert_kpi("HYPERKERATOSIS_RISK", avg_overmilk,       k_hk)
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

# ----------------------------------------------------------------
# -------------------------- SPEED TEST --------------------------
# ----------------------------------------------------------------

@app.post("/speed/runs", response_model=SpeedRunOut)
def create_speed_run(payload: SpeedRunIn, session: Session = Depends(get_session), user=Depends(require_role("admin"))):
    run = SpeedRun(
        product_application_id=payload.product_application_id,
        measure_ml=payload.measure_ml,
        performed_at=payload.performed_at,
        notes=payload.notes
    )
    session.add(run); session.commit(); session.refresh(run)
    return run

@app.post("/speed/runs/{run_id}/compute", response_model=list[KpiValueOut])
def compute_speed_kpis(run_id: int, session: Session = Depends(get_session), user=Depends(require_role("admin"))):
    run = session.get(SpeedRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.measure_ml is None:
        raise HTTPException(status_code=400, detail="Missing measure_ml")

    context = json.dumps({"agg":"final"})

    # 1) salva metrica derivata (SPEED_ML) su test_metrics (upsert semplice)
    session.exec(sa.delete(TestMetric).where(
        (TestMetric.run_type=="SPEED") & (TestMetric.run_id==run.id) &
        (TestMetric.metric_code=="SPEED_ML") & (TestMetric.context_json==context)
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

    # 2) calcola KPI SPEED
    score = score_from_scales(session, "SPEED", run.measure_ml)

    session.exec(sa.delete(KpiValue).where(
        (KpiValue.run_type=="SPEED") & (KpiValue.run_id==run.id) &
        (KpiValue.kpi_code=="SPEED") & (KpiValue.context_json==context)
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

    return [KpiValueOut(
        kpi_code=kv.kpi_code, value_num=kv.value_num, score=kv.score,
        unit=kv.unit, context_json=kv.context_json, computed_at=kv.computed_at
    )]

@app.get("/speed/runs", response_model=list[SpeedRunOut])
def list_speed_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    q = select(SpeedRun)
    if product_application_id:
        q = q.where(SpeedRun.product_application_id == product_application_id)
    q = q.order_by(SpeedRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()

@app.get("/speed/runs/{run_id}/kpis", response_model=list[KpiValueOut])
def get_speed_run_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
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

@app.get("/speed/last-run-by-application/{product_application_id}", response_model=Optional[SpeedRunOut])
def get_last_speed_run_for_application(
    product_application_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    run = session.exec(
        select(SpeedRun)
        .where(SpeedRun.product_application_id == product_application_id)
        .order_by(SpeedRun.created_at.desc())
    ).first()
    return run



# ----------------------------------------------------------------
# -------------------------- SMT/HOOD --------------------------
# ----------------------------------------------------------------

ALLOWED_FLOWS = [0.5, 1.9, 3.6]
MILK_VAC = 45.0

def _flow_code(lpm: float) -> int:
    # robusto a 1.8999 -> 19
    return int(round(lpm * 10))

def _norm_flow(lpm: float) -> float:
    # normalizza al valore canonico più vicino (0.5/1.9/3.6)
    best = min(ALLOWED_FLOWS, key=lambda f: abs(f - float(lpm)))
    return best

@app.post("/smt-hood/runs", response_model=dict)
def create_smt_hood_run(
    payload: dict = Body(...),  # { product_application_id, points:[{flow_lpm,smt_min,smt_max,hood_min,hood_max}x3], notes?, performed_at? }
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
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
        notes=payload.get("notes")
    )
    session.add(run); session.commit(); session.refresh(run)

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
        row = SmtHoodPoint(
            run_id=run.id, flow_code=code, flow_lpm=fl,
            smt_min=smt_min, smt_max=smt_max, hood_min=hood_min, hood_max=hood_max
        )
        session.add(row)
    session.commit()

    saved = session.exec(
        select(SmtHoodPoint).where(SmtHoodPoint.run_id == run.id).order_by(SmtHoodPoint.flow_code.asc())
    ).all()

    return {
        "id": run.id,
        "product_application_id": pa_id,
        "points": [
            {
                "flow_lpm": r.flow_lpm,
                "smt_min": r.smt_min, "smt_max": r.smt_max,
                "hood_min": r.hood_min, "hood_max": r.hood_max
            } for r in saved
        ],
    }


@app.put("/smt-hood/runs/{run_id}/points", response_model=dict)
def upsert_smt_hood_points(
    run_id: int = Path(..., ge=1),
    points: List[SmtHoodPointIn] = Body(...),
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
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
        smt_min = float(p.smt_min); smt_max = float(p.smt_max)
        hood_min = float(p.hood_min); hood_max = float(p.hood_max)
        if smt_max < smt_min or hood_max < hood_min:
            raise HTTPException(status_code=400, detail="max must be >= min for SMT and HOOD")
        by_code[code] = (fl, smt_min, smt_max, hood_min, hood_max)

    # upsert semplice: delete -> insert
    session.exec(sa.delete(SmtHoodPoint).where(SmtHoodPoint.run_id == run_id))
    for code, (fl, smt_min, smt_max, hood_min, hood_max) in by_code.items():
        session.add(SmtHoodPoint(
            run_id=run_id, flow_code=code, flow_lpm=fl,
            smt_min=smt_min, smt_max=smt_max, hood_min=hood_min, hood_max=hood_max
        ))
    session.commit()

    saved = session.exec(
        select(SmtHoodPoint).where(SmtHoodPoint.run_id == run_id).order_by(SmtHoodPoint.flow_code.asc())
    ).all()
    return {
        "id": run_id,
        "points": [
            {
                "flow_lpm": r.flow_lpm,
                "smt_min": r.smt_min, "smt_max": r.smt_max,
                "hood_min": r.hood_min, "hood_max": r.hood_max
            } for r in saved
        ]
    }

@app.post("/smt-hood/runs/{run_id}/compute", response_model=dict)
def compute_smt_hood_kpis(
    run_id: int,
    session: Session = Depends(get_session),
    user = Depends(require_role("admin")),
):
    run = session.get(SmtHoodRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # punti del run
    pts = session.exec(select(SmtHoodPoint).where(SmtHoodPoint.run_id == run_id)).all()
    by = {p.flow_code: p for p in pts}
    needed = [_flow_code(f) for f in ALLOWED_FLOWS]
    if not all(k in by for k in needed):
        raise HTTPException(status_code=400, detail="Run requires 3 points at flows 0.5, 1.9, 3.6 L/min")

    # pulizia metriche del run (idempotente)
    session.exec(sa.delete(TestMetric).where(
        (TestMetric.run_type == "SMT_HOOD") & (TestMetric.run_id == run.id)
    ))
    session.commit()

    results: dict[float, dict] = {}
    # accumulatori per medie finali
    respray_vals: list[float]  = []
    fluydo_vals: list[float]   = []
    slippage_vals: list[float] = []
    ringing_vals: list[float]  = []

    # ---- per-flow: calcolo, scoring e persistenza metriche derivate ----
    for fl in ALLOWED_FLOWS:
        code = _flow_code(fl)
        p = by[code]

        smt_min, smt_max   = float(p.smt_min), float(p.smt_max)
        hood_min, hood_max = float(p.hood_min), float(p.hood_max)

        # derivati (kPa)
        respray_val  = smt_max - MILK_VAC
        fluydo_val   = (smt_max - smt_min) - (smt_max - MILK_VAC) if smt_max > MILK_VAC else (smt_max - smt_min)
        slippage_val = (hood_max - hood_min) - (hood_max - MILK_VAC) if hood_max > MILK_VAC else (hood_max - hood_min)
        ringing_val  = hood_max - MILK_VAC

        # score per-flow (fallirà 422 se manca una banda per quel KPI)
        s_respray  = _score_or_422(session, "RESPRAY",        respray_val)
        s_fluydo   = _score_or_422(session, "FLUYDODINAMIC",  fluydo_val)
        s_slippage = _score_or_422(session, "SLIPPAGE",       slippage_val)
        s_ringing  = _score_or_422(session, "RINGING_RISK",   ringing_val)

        # salva metriche derivate per-flow
        def save_metric(code: str, value: float):
            session.add(TestMetric(
                run_type="SMT_HOOD",
                run_id=run.id,
                product_application_id=run.product_application_id,
                metric_code=code,
                value_num=float(value),
                unit="kPa",
                context_json=json.dumps({"flow_lpm": fl}),
            ))
        save_metric("RESPRAY_VAL",         respray_val)
        save_metric("FLUYDODINAMIC_VAL",   fluydo_val)   # <- allineato al codice KPI
        save_metric("SLIPPAGE_VAL",        slippage_val)
        save_metric("RINGING_VAL",         ringing_val)

        results[fl] = {
            "respray":       {"value": respray_val,  "score": s_respray},
            "fluydodinamic": {"value": fluydo_val,   "score": s_fluydo},
            "slippage":      {"value": slippage_val, "score": s_slippage},
            "ringing_risk":  {"value": ringing_val,  "score": s_ringing},
        }

        respray_vals.append(respray_val)
        fluydo_vals.append(fluydo_val)
        slippage_vals.append(slippage_val)
        ringing_vals.append(ringing_val)

    # ---- KPI finali (medie 3 flow) + upsert in kpi_values ----
    def _avg(xs: list[float]) -> float:
        return (sum(xs) / len(xs)) if xs else 0.0

    avg_respray  = _avg(respray_vals)
    avg_fluydo   = _avg(fluydo_vals)
    avg_slip     = _avg(slippage_vals)
    avg_ringing  = _avg(ringing_vals)

    s_avg_respray = _score_or_422(session, "RESPRAY",        avg_respray)
    s_avg_fluydo  = _score_or_422(session, "FLUYDODINAMIC",  avg_fluydo)
    s_avg_slip    = _score_or_422(session, "SLIPPAGE",       avg_slip)
    s_avg_ring    = _score_or_422(session, "RINGING_RISK",   avg_ringing)

    def upsert_kpi(code: str, value_avg: float, score: int, unit: str | None = "kPa"):
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code,
            )
        ).first()
        ctx_str = json.dumps({"flows": ALLOWED_FLOWS, "agg": "final"})
        if kv:
            kv.value_num = float(value_avg)
            kv.score     = int(score)
            kv.run_type  = "SMT_HOOD"
            kv.run_id    = run.id
            kv.unit      = unit
            kv.context_json = ctx_str
            session.add(kv)
        else:
            session.add(KpiValue(
                product_application_id=run.product_application_id,
                kpi_code=code,
                value_num=float(value_avg),
                score=int(score),
                run_type="SMT_HOOD",
                run_id=run.id,
                unit=unit,
                context_json=ctx_str,
            ))

    upsert_kpi("RESPRAY",        avg_respray, s_avg_respray)
    upsert_kpi("FLUYDODINAMIC",  avg_fluydo,  s_avg_fluydo)   # <- stesso codice del DB/scale
    upsert_kpi("SLIPPAGE",       avg_slip,    s_avg_slip)
    upsert_kpi("RINGING_RISK",   avg_ringing, s_avg_ring)

    session.commit()

    def _r1(x: float) -> float:
        return float(f"{x:.1f}")

    return {
        "run_id": run.id,
        "product_application_id": run.product_application_id,
        "flows": results,
        "final": {
            "RESPRAY":       {"value": _r1(avg_respray), "score": s_avg_respray, "unit": "kPa"},
            "FLUYDODINAMIC": {"value": _r1(avg_fluydo),  "score": s_avg_fluydo,  "unit": "kPa"},
            "SLIPPAGE":      {"value": _r1(avg_slip),    "score": s_avg_slip,    "unit": "kPa"},
            "RINGING_RISK":  {"value": _r1(avg_ringing), "score": s_avg_ring,    "unit": "kPa"},
        },
    }

@app.get("/smt-hood/runs", response_model=list[SmtHoodRunOut])
def list_smt_hood_runs(
    product_application_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    q = select(SmtHoodRun)
    if product_application_id:
        q = q.where(SmtHoodRun.product_application_id == product_application_id)
    q = q.order_by(SmtHoodRun.created_at.desc()).limit(limit).offset(offset)
    return session.exec(q).all()

@app.get("/smt-hood/runs/latest", response_model=dict)
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
            "smt_min": p.smt_min, "smt_max": p.smt_max,
            "hood_min": p.hood_min, "hood_max": p.hood_max
        } for p in pts
    ]

    return {
        "run": {
            "id": run.id,
            "product_application_id": run.product_application_id,
            "performed_at": run.performed_at,
            "notes": run.notes,
            "created_at": run.created_at,
            "points": points_payload,  # compat FE
        },
        "points": points_payload,
    }


