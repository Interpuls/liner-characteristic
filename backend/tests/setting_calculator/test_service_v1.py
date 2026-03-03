import pytest
from sqlmodel import SQLModel, Session, create_engine

from app.services.setting_calculator.service import compare_settings_v1
from app.schema.setting_calculator.request_v1 import CompareRequestV1, SideRequestV1, UserInputsV1

from app.model.product import Product, ProductApplication
from app.model.tpp import TppRun
from app.model.kpi import TestMetric as DbTestMetric


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(
        engine,
        tables=[
            Product.__table__,
            ProductApplication.__table__,
            TppRun.__table__,
            DbTestMetric.__table__,
        ],
    )
    with Session(engine) as session:
        yield session

def seed_data(session):
    product = Product(code="T1", name="Test", model="ModelX", brand="BrandX")
    session.add(product)
    session.commit()
    session.refresh(product)

    app = ProductApplication(product_id=product.id, size_mm=20)
    session.add(app)
    session.commit()
    session.refresh(app)

    tpp = TppRun(product_application_id=app.id, real_tpp=10.0)
    session.add(tpp)

    metric_pf = DbTestMetric(
        run_type="MASSAGE",
        run_id=1,
        product_application_id=app.id,
        metric_code="AVG_PF",
        value_num=20.0,
    )

    metric_om = DbTestMetric(
        run_type="MASSAGE",
        run_id=1,
        product_application_id=app.id,
        metric_code="AVG_OVERMILK",
        value_num=15.0,
    )

    session.add(metric_pf)
    session.add(metric_om)

    session.commit()

    return app.id


def make_request(app_id):
    inputs = UserInputsV1(
        milkingVacuumMaxKpa=42.0,
        pfVacuumKpa=38.0,
        omVacuumKpa=30.0,
        omDurationSec=60.0,
        frequencyBpm=60.0,
        ratioPct=60.0,
        phaseAMs=150.0,
        phaseCMs=150.0,
    )

    return CompareRequestV1(
        schemaVersion="1.0",
        requestId="test",
        left=SideRequestV1(productApplicationId=app_id, inputs=inputs),
        right=SideRequestV1(productApplicationId=app_id, inputs=inputs),
    )


def test_service_full_flow(session):
    app_id = seed_data(session)

    request = make_request(app_id)

    response = compare_settings_v1(session, request)

    assert response.left.liner.model == "ModelX"
    assert response.left.derived.deltaKpa == pytest.approx(32.0)
    assert response.diffPct.massageIntensity.pf == pytest.approx(0.0)
