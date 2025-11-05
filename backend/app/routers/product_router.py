import re
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.product import Product, ProductApplication
from app.model.search import SearchPreference
from app.model.kpi import KpiDef
from app.model.user import UserRole
from app.schema.product import (
    ProductIn,
    ProductOut,
    ProductMetaOut,
    ProductPreferenceIn,
    ProductPreferenceOut,
)
from app.schema.product import SIZE_LABELS

router = APIRouter()


# -------------------------------------------------------------------------
# ---------------------------- PRODUCTS -----------------------------------
# -------------------------------------------------------------------------

#META: distinct values per i dropdown
@router.get("/meta", response_model=ProductMetaOut)
def products_meta(session: Session = Depends(get_session), user=Depends(get_current_user)):
    is_admin = getattr(user, "role", "") == "admin"

    def distinct_list(col, extra_where=None):
        q = select(func.distinct(col)).where(col.isnot(None))
        if extra_where is not None:
            q = q.where(extra_where)
        rows = session.exec(q).all()
        return [r[0] if isinstance(r, tuple) else r for r in rows if r is not None]

    product_types = distinct_list(Product.product_type) or ["liner"]

    #Brand: nascondi i prodotti only_admin=True agli user non admin
    brand_where = None if is_admin else (Product.only_admin == False)
    brands = distinct_list(Product.brand, extra_where=brand_where)
    
    #Models: lista “globale” come prima (può rimanere così)
    models = distinct_list(Product.model, extra_where=brand_where)

    compounds = distinct_list(Product.compound, extra_where=brand_where)

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


# MODELS
@router.get("/models", response_model=List[str])
def list_models_by_brand(
    brand: str = Query(...),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    is_admin = getattr(user, "role", "") == "admin"
    q = select(func.distinct(Product.model)).where(
        Product.brand == brand,
        Product.model.isnot(None),
    )
    if not is_admin:
        q = q.where(Product.only_admin == False)
    rows = session.exec(q).all()
    return [r[0] if isinstance(r, (tuple, list)) else r for r in rows if r is not None]


#LIST con filtri base (senza KPI per ora)
@router.get("/", response_model=List[ProductOut])
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
    if product_type:
        qy = qy.where(Product.product_type == product_type)
    if brand:
        qy = qy.where(Product.brand == brand)
    if model:
        qy = qy.where(Product.model == model)
    if compound:
        qy = qy.where(Product.compound == _norm_compound(compound))
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


#PREFERENCES(salvataggio/lettura per utente)
@router.get("/preferences", response_model=List[ProductPreferenceOut])
def list_prefs(session: Session = Depends(get_session), user=Depends(get_current_user)):
    q = (
        select(SearchPreference)
        .where(SearchPreference.user_id == user.id)
        .order_by(SearchPreference.created_at.desc())
    )
    return session.exec(q).all()


@router.post("/preferences", response_model=ProductPreferenceOut)
def save_pref(payload: ProductPreferenceIn, session: Session = Depends(get_session), user=Depends(get_current_user)):
    existing = session.exec(
        select(SearchPreference).where(
            SearchPreference.user_id == user.id,
            SearchPreference.name == payload.name,
        )
    ).first()
    if existing:
        existing.filters = payload.filters
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    pref = SearchPreference(user_id=user.id, name=payload.name, filters=payload.filters)
    session.add(pref)
    session.commit()
    session.refresh(pref)
    return pref


# UTILS
def _norm_compound(x: str | None) -> str:
    return (x or "STD").strip().upper()


def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "product"


# CREATE PRODUCT
@router.post("/", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def create_product(payload: ProductIn, session: Session = Depends(get_session)):
    brand = (payload.brand or "").strip()
    model = (payload.model or "").strip()
    compound = _norm_compound(payload.compound or "STD")
    only_admin = True if payload.only_admin is None else bool(payload.only_admin)

#unicità (brand, model, compound)
    try:
        # se questa nasce pubblica => demoto eventuali altre pubbliche di stesso brand/model
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

        # Generazione code univoco con retry solo in caso di collisione su code
        base_code = payload.code or _slugify(f"{brand}-{model}-{compound}")
        suffix = 0
        max_tries = 50
        while True:
            code = base_code if suffix == 0 else f"{base_code}-{suffix}"

            data = payload.dict(exclude_unset=True)
            data.update({
                "code": code,
                "name": payload.name or model or code,
                "product_type": "liner",
                "brand": brand,
                "model": model,
                "compound": compound,
                "only_admin": only_admin,
            })

            obj = Product(**data)
            session.add(obj)
            try:
                session.flush()
            except IntegrityError as e:
                # Gestisci collisioni su vincoli unici
                session.rollback()
                msg = str(getattr(e, "orig", e))
                if "ux_products_code" in msg:
                    # prova con un suffisso incrementale
                    suffix += 1
                    if suffix > max_tries:
                        raise HTTPException(status_code=409, detail="Could not generate a unique product code")
                    continue
                if "ux_products_brand_model_compound" in msg:
                    raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")
                # altri errori di integrità
                raise HTTPException(status_code=409, detail="Could not create product")

            # crea le 4 application standard
            for size in (40, 50, 60, 70):
                session.add(ProductApplication(
                    product_id=obj.id,
                    size_mm=size,
                    label=SIZE_LABELS[size],
                ))

            session.commit()
            return obj

    except HTTPException:
        # già gestito sopra
        raise
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Could not create product")


#GET 
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj

#UPDATE
@router.put("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def update_product(product_id: int, payload: ProductIn, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")

#Prendi solo i campi realmente passati
    data = payload.dict(exclude_unset=True)
#Normalizzazioni e regole speciali
#brand/model/compound
    if "brand" in data:
        data["brand"] = (data["brand"] or "").strip()
    if "model" in data:
        data["model"] = (data["model"] or "").strip()
    if "compound" in data:
        data["compound"] = _norm_compound(data["compound"])
    if "only_admin" in data:
        data["only_admin"] = bool(data["only_admin"])

 #Calcola i "nuovi" brand/model/compound da usare per i controlli di unicità
    new_brand = data.get("brand", obj.brand) or ""
    new_model = data.get("model", obj.model) or ""
    new_compound = data.get("compound", obj.compound)
 #Unicità (brand, model, compound) escludendo se stesso
    try:
        #Se diventa pubblico => demoto eventuali altri pubblici stesso brand/model
        becoming_public = ("only_admin" in data) and (data["only_admin"] is False)
        if becoming_public:
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

        data.pop("product_type", None)

    #Applica la patch campo per campo
        for k, v in data.items():
            setattr(obj, k, v)
    #Aggiorna i campi derivati che hai già in logica (se name non passato, NON lo tocco)
        session.add(obj)
        session.commit()
        return obj

    except IntegrityError as e:
        session.rollback()
        msg = str(getattr(e, "orig", e))
        if "ux_products_brand_model_compound" in msg:
            raise HTTPException(status_code=409, detail="Product with same brand, model and compound already exists")
        if "ux_products_code" in msg or "code" in msg:
            raise HTTPException(status_code=409, detail="Product code already exists")
        raise HTTPException(status_code=409, detail="Update violates unique constraints")
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Could not update product")

#DELETE
@router.delete("/{product_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_product(product_id: int, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return None
