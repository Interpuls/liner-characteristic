from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from app.services.conversion_wrapper import convert_output
from pydantic import BaseModel

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.product import Product, ProductApplication
from app.schema.product import ProductApplicationIn, ProductApplicationOut, SIZE_LABELS

router = APIRouter()


class ProductApplicationsBatchIn(BaseModel):
    product_ids: list[int]


# --------------------------------------------------------------------------
# ------------------------ PRODUCT APPLICATIONS ----------------------------
# --------------------------------------------------------------------------

@router.post("/applications/batch-by-products", response_model=dict[str, list[ProductApplicationOut]])
@convert_output
def list_product_applications_batch(
    payload: ProductApplicationsBatchIn,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    raw_ids = payload.product_ids or []
    deduped_ids = list(dict.fromkeys(int(x) for x in raw_ids if int(x) > 0))
    if not deduped_ids:
        return {}
    if len(deduped_ids) > 200:
        raise HTTPException(status_code=422, detail="Maximum 200 product_ids allowed")

    is_admin = getattr(user, "role", "") == "admin"
    products = session.exec(select(Product).where(Product.id.in_(deduped_ids))).all()
    visible = [p for p in products if is_admin or not p.only_admin]
    visible_ids = {p.id for p in visible}

    rows = session.exec(
        select(ProductApplication)
        .where(ProductApplication.product_id.in_(visible_ids))
        .order_by(
            ProductApplication.product_id.asc(),
            ProductApplication.size_mm.asc(),
            ProductApplication.created_at.asc(),
        )
    ).all() if visible_ids else []

    grouped: dict[str, list[ProductApplicationOut]] = {str(pid): [] for pid in visible_ids}
    for row in rows:
        grouped[str(row.product_id)].append(row)
    return grouped

#Restituisce la lista di applicazioni (teat sizes) associate a un prodotto
@router.get(
    "/{product_id}/applications",
    response_model=list[ProductApplicationOut]
)
@convert_output
def list_product_applications(
    product_id: int = Path(..., ge=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    prod = session.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    is_admin = getattr(user, "role", "") == "admin"
    if not is_admin and prod.only_admin:
        raise HTTPException(status_code=404, detail="Product not found")

    q = (
        select(ProductApplication)
        .where(ProductApplication.product_id == product_id)
        .order_by(ProductApplication.size_mm.asc(), ProductApplication.created_at.asc())
    )
    return session.exec(q).all()

#Crea una nuova applicazione (size) per un determinato prodotto (solo admin)
@router.post(
    "/{product_id}/applications",
    response_model=ProductApplicationOut,
    dependencies=[Depends(require_role("admin"))],
)
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
        label=SIZE_LABELS[payload.size_mm],
    )

    session.add(app_obj)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Application for this size already exists")

    session.refresh(app_obj)
    return app_obj

#Elimina una singola application per un determinato prodotto (solo admin)
@router.delete(
    "/{product_id}/applications/{app_id}",
    status_code=204,
    dependencies=[Depends(require_role("admin"))],
)
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
    return None
