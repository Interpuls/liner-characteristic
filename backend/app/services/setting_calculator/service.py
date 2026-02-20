from __future__ import annotations

from sqlmodel import Session, select
from fastapi import HTTPException

from app.model.product import Product, ProductApplication
from app.model.tpp import TppRun
from app.model.kpi import TestMetric

from app.schema.setting_calculator.request_v1 import CompareRequestV1
from app.schema.setting_calculator.response_v1 import (
    CompareResponseV1,
    SideResultV1,
    LinerInfoV1,
    DiffPctV1,
    DiffPairV1,
)
from app.schema.setting_calculator.errors import (
    ValidationErrorResponseV1,
    ErrorBodyV1,
    FieldErrorV1,
)

from app.services.setting_calculator.validation_v1 import validate_compare_request
from app.services.setting_calculator.engine_v1 import compute_side_result_v1


ENGINE_VERSION = "setting-calculator-engine@1.0.0"


def _raise_422(request_id: str, field_errors):
    raise HTTPException(
        status_code=422,
        detail=ValidationErrorResponseV1(
            requestId=request_id,
            error=ErrorBodyV1(
                fields=[FieldErrorV1(path=e.path, reason=e.reason) for e in field_errors]
            ),
        ).model_dump(),
    )


def _get_application_or_404(session: Session, application_id: int) -> ProductApplication:
    app = session.get(ProductApplication, application_id)
    if not app:
        raise HTTPException(status_code=404, detail=f"ProductApplication {application_id} not found")
    return app


def _get_product_or_404(session: Session, product_id: int) -> Product:
    prod = session.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return prod


def _get_latest_tpp_kpa(session: Session, product_application_id: int) -> float:
    run = session.exec(
        select(TppRun)
        .where(TppRun.product_application_id == product_application_id)
        .order_by(TppRun.created_at.desc())
    ).first()

    if not run or run.real_tpp is None:
        raise HTTPException(
            status_code=422,
            detail=f"Missing TPP run/real_tpp for productApplicationId={product_application_id}",
        )
    return float(run.real_tpp)


def _get_latest_metric_value(session: Session, product_application_id: int, metric_code: str) -> float:
    row = session.exec(
        select(TestMetric)
        .where(
            (TestMetric.run_type == "MASSAGE")
            & (TestMetric.product_application_id == product_application_id)
            & (TestMetric.metric_code == metric_code)
        )
        .order_by(TestMetric.computed_at.desc())
    ).first()

    if not row:
        raise HTTPException(
            status_code=422,
            detail=f"Missing metric {metric_code} for productApplicationId={product_application_id}",
        )
    return float(row.value_num)


def _build_liner_info(
    session: Session,
    product_application_id: int,
) -> LinerInfoV1:
    app = _get_application_or_404(session, product_application_id)

    product_id = getattr(app, "product_id", None)
    if product_id is None and getattr(app, "product", None) is not None:
        product_id = app.product.id  # type: ignore

    if product_id is None:
        raise HTTPException(
            status_code=422,
            detail=f"ProductApplication {product_application_id} has no product_id",
        )

    prod = _get_product_or_404(session, int(product_id))

    tpp_kpa = _get_latest_tpp_kpa(session, product_application_id)

    # Intensities da TestMetric (derivati già salvati)
    intensity_pf_kpa = _get_latest_metric_value(session, product_application_id, "AVG_PF")
    intensity_om_kpa = _get_latest_metric_value(session, product_application_id, "AVG_OVERMILK")

    return LinerInfoV1(
        id=prod.id,
        model=prod.model or prod.name,
        brand=prod.brand or "",
        tppKpa=tpp_kpa,
        intensityPfKpa=intensity_pf_kpa,
        intensityOmKpa=intensity_om_kpa,
    )

#Calcolo perrcentuale per gli ultimi grafici
def _pct(left: float, right: float) -> float:
    if left == 0:
        return 0.0
    return ((right - left) / left) * 100.0


def compare_settings_v1(session: Session, req: CompareRequestV1) -> CompareResponseV1:
    # 1) Validate multi-field rules
    errs = validate_compare_request(req.left.inputs, req.right.inputs)
    if errs:
        _raise_422(req.requestId, errs)

    # 2) Fetch liner data (db)
    left_liner = _build_liner_info(session, req.left.productApplicationId)
    right_liner = _build_liner_info(session, req.right.productApplicationId)

    # 3) Compute sides (engine)
    left_res: SideResultV1 = compute_side_result_v1(left_liner, req.left.inputs)
    right_res: SideResultV1 = compute_side_result_v1(right_liner, req.right.inputs)

    # 4) DiffPct
    diff = DiffPctV1(
        appliedVacuum=DiffPairV1(
            pf=_pct(left_res.derived.deltaKpa, right_res.derived.deltaKpa),
            om=_pct(left_res.derived.deltaKpa, right_res.derived.deltaKpa),
        ),
        massageIntensity=DiffPairV1(
            pf=_pct(left_liner.intensityPfKpa, right_liner.intensityPfKpa),
            om=_pct(left_liner.intensityOmKpa, right_liner.intensityOmKpa),
        ),
    )

    # 5) Response
    return CompareResponseV1(
        engineVersion=ENGINE_VERSION,
        requestId=req.requestId,
        left=left_res,
        right=right_res,
        diffPct=diff,
        warnings=[],
    )
