import os
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlmodel import Session, select
import re
from starlette.middleware.gzip import GZipMiddleware
from typing import Optional

from .db import init_db, get_session
from .models import User, Product, SearchPreference, KpiDef, FormulaType
from .schemas import UserCreate, UserOut, Token, ProductIn, ProductOut, ProductMetaOut, ProductPreferenceIn, ProductPreferenceOut, KpiDefIn, KpiDefOut
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors

ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "milkrite.com")

app = FastAPI(title="Liner Characteristic API")

logger = logging.getLogger("liner-backend")
logging.basicConfig(level=logging.INFO)

app.add_middleware(GZipMiddleware, minimum_size=500)

apply_cors(app)

@app.on_event("startup")
def on_startup():
    init_db()

# -------------------------- Routes ----------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({"ok": True, "docs": "/docs", "health": "/healthz"})


# ------------------------- Middleware -------------------------------------------

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
    teat_sizes   = distinct_list(Product.teat_size)
    kpis         = session.exec(select(KpiDef).order_by(KpiDef.created_at.asc())).all()

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
    teat_size: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    qy = select(Product)
    if product_type: qy = qy.where(Product.product_type == product_type)
    if brand:        qy = qy.where(Product.brand == brand)
    if model:        qy = qy.where(Product.model == model)
    if teat_size:    qy = qy.where(Product.teat_size == teat_size)  
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
    # 1) vincolo (brand, model) univoco applicativo
    exists_bm = session.exec(
        select(Product).where(Product.brand == payload.brand, Product.model == payload.model)
    ).first()
    if exists_bm:
        raise HTTPException(status_code=409, detail="Product with same brand and model already exists")

    # 2) code: se non arriva, generiamo da brand+model (unico con suffisso)
    code = payload.code or slugify(f"{payload.brand}-{payload.model}")
    # univocità sul code
    base_code = code
    i = 1
    while session.exec(select(Product).where(Product.code == code)).first():
        i += 1
        code = f"{base_code}-{i}"

    # 3) name: se non arriva, usiamoa model 
    name = payload.name or payload.model

    obj = Product(
        code=code,
        name=name,
        description=payload.description,
        product_type="liner",  # default 
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
        session.commit()
    except IntegrityError:
        session.rollback()
        # se due richieste parallele arrivano insieme, la seconda finisce qui:
        raise HTTPException(status_code=409, detail="Product with same brand and model already exists")
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
    # se cambia il code, verifica unicità
    if obj.code != payload.code:
        exists = session.exec(select(Product).where(Product.code == payload.code)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product code already exists")
    obj.code = payload.code
    obj.name = payload.name
    obj.description = payload.description
    session.add(obj)
    session.commit()
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
