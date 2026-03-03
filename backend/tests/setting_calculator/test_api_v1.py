import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, text
from sqlalchemy.pool import StaticPool


from app.main import app 
from app.db import get_session
from app.auth import get_current_user  


from app.model.product import Product, ProductApplication
from app.model.tpp import TppRun
from app.model.kpi import TestMetric as DbTestMetric

@pytest.fixture(scope="session")
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(
        engine,
        tables=[
            Product.__table__,
            ProductApplication.__table__,
            TppRun.__table__,
            DbTestMetric.__table__,
        ],
    )
    return engine


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        # CLEAN DB per test (ordine: figli -> padri)
        s.exec(text("DELETE FROM test_metrics"))
        s.exec(text("DELETE FROM tpp_runs"))
        s.exec(text("DELETE FROM product_applications"))
        s.exec(text("DELETE FROM products"))
        s.commit()

        yield s


@pytest.fixture
def client(session: Session):
    def override_get_session():
        yield session

    def override_get_current_user():
        return {"id": 1, "role": "admin"}

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user

    app.user_middleware = [
        m for m in app.user_middleware
        if m.cls.__name__ != "GZipMiddleware"
    ]
    app.middleware_stack = app.build_middleware_stack()

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()



def seed_app(session: Session) -> int:
    product = Product(code="T1", name="Test", model="ModelX", brand="BrandX")
    session.add(product)
    session.commit()
    session.refresh(product)

    pa = ProductApplication(product_id=product.id, size_mm=20)
    session.add(pa)
    session.commit()
    session.refresh(pa)

    session.add(TppRun(product_application_id=pa.id, real_tpp=10.0))
    session.add(
        DbTestMetric(
            run_type="MASSAGE",
            run_id=1,
            product_application_id=pa.id,
            metric_code="AVG_PF",
            value_num=20.0,
        )
    )
    session.add(
        DbTestMetric(
            run_type="MASSAGE",
            run_id=1,
            product_application_id=pa.id,
            metric_code="AVG_OVERMILK",
            value_num=15.0,
        )
    )
    session.commit()

    return pa.id


def build_payload(app_id: int):
    return {
        "schemaVersion": "1.0",
        "requestId": "test-api",
        "left": {
            "productApplicationId": app_id,
            "inputs": {
                "milkingVacuumMaxKpa": 42.0,
                "pfVacuumKpa": 38.0,
                "omVacuumKpa": 30.0,
                "omDurationSec": 60.0,
                "frequencyBpm": 60.0,
                "ratioPct": 60.0,
                "phaseAMs": 150.0,
                "phaseCMs": 150.0,
            },
        },
        "right": {
            "productApplicationId": app_id,
            "inputs": {
                "milkingVacuumMaxKpa": 42.0,
                "pfVacuumKpa": 38.0,
                "omVacuumKpa": 30.0,
                "omDurationSec": 60.0,
                "frequencyBpm": 60.0,
                "ratioPct": 60.0,
                "phaseAMs": 150.0,
                "phaseCMs": 150.0,
            },
        },
    }


def test_api_compare_ok(client, session):
    app_id = seed_app(session)
    payload = build_payload(app_id)

    r = client.post("/setting-calculator/compare", json=payload)
    assert r.status_code == 200

    data = r.json()
    assert data["engineVersion"].startswith("setting-calculator-engine@")
    assert data["left"]["liner"]["model"] == "ModelX"
    assert data["left"]["derived"]["deltaKpa"] == pytest.approx(32.0)


def test_api_compare_404_missing_application(client):
    payload = build_payload(app_id=999999)

    r = client.post("/setting-calculator/compare", json=payload)
    assert r.status_code == 404


def test_api_compare_422_validation(client, session):
    app_id = seed_app(session)
    payload = build_payload(app_id)

    # forzo invalid: pfVacuumKpa > max
    payload["left"]["inputs"]["pfVacuumKpa"] = 999.0

    r = client.post("/setting-calculator/compare", json=payload)
    assert r.status_code == 422
