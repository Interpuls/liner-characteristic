import asyncio

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.middleware_limits import RequestSizeLimitMiddleware, RequestTimeoutMiddleware


def build_app(*, max_body_bytes=32, timeout_seconds=0.05):
    app = FastAPI()
    app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=timeout_seconds)
    app.add_middleware(RequestSizeLimitMiddleware, max_body_bytes=max_body_bytes)

    @app.post("/echo")
    async def echo(request: Request):
        body = await request.body()
        return {"size": len(body)}

    @app.get("/sleep")
    async def sleep():
        await asyncio.sleep(0.2)
        return {"ok": True}

    return app


def test_request_size_limit_rejects_large_payload():
    client = TestClient(build_app(max_body_bytes=8))
    response = client.post("/echo", data=b"0123456789")
    assert response.status_code == 413
    assert "Request body too large" in response.json()["detail"]


def test_request_timeout_rejects_slow_request():
    client = TestClient(build_app(timeout_seconds=0.01))
    response = client.get("/sleep")
    assert response.status_code == 504
    assert response.json()["detail"] == "Request processing timed out."
