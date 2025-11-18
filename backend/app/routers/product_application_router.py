from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.product import Product, ProductApplication
from app.schema.product import ProductApplicationIn, ProductApplicationOut, SIZE_LABELS

router = APIRouter()


# --------------------------------------------------------------------------
# ------------------------ PRODUCT APPLICATIONS ----------------------------
# --------------------------------------------------------------------------

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
@convert_output
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
@convert_output
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
