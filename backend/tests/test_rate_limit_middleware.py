from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware_rate_limit import RateLimitRule, SensitiveRateLimitMiddleware


def build_app(rules):
    app = FastAPI()
    app.add_middleware(SensitiveRateLimitMiddleware, rules=tuple(rules))

    @app.post("/auth/login")
    async def login():
        return {"ok": True}

    @app.get("/healthz")
    async def healthz():
        return {"ok": True}

    return app


def test_sensitive_endpoint_is_rate_limited():
    rules = [RateLimitRule("auth_login", "POST", r"^/auth/login$", 2, 60)]
    client = TestClient(build_app(rules))

    assert client.post("/auth/login").status_code == 200
    assert client.post("/auth/login").status_code == 200

    third = client.post("/auth/login")
    assert third.status_code == 429
    assert third.headers["Retry-After"]
    assert "Rate limit exceeded for auth_login" in third.json()["detail"]


def test_non_sensitive_endpoint_is_not_rate_limited():
    rules = [RateLimitRule("auth_login", "POST", r"^/auth/login$", 1, 60)]
    client = TestClient(build_app(rules))

    first = client.get("/healthz")
    second = client.get("/healthz")

    assert first.status_code == 200
    assert second.status_code == 200
