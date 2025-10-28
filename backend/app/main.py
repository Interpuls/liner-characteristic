import os
import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.db import init_db
from app.deps import apply_cors

# Routers
from app.routers import (
    auth_router, user_router, product_router, product_application_router,
    kpi_router, tpp_router, massage_router, speed_router, smt_hood_router
)

app = FastAPI(
    title="Liner Characteristic API",
    version="1.0.0",
    description="Backend per la gestione delle caratteristiche dei liner e test KPI."
)

logger = logging.getLogger("liner-backend")
logging.basicConfig(level=logging.INFO)

@app.on_event("startup")
def on_startup():
    init_db()

# Routers
app.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])
app.include_router(user_router.router, prefix="/users", tags=["Users"])
app.include_router(product_router.router, prefix="/products", tags=["Products"])
app.include_router(product_application_router.router, prefix="/products", tags=["Product Applications"])
app.include_router(kpi_router.router, prefix="/kpis", tags=["KPIs"])
app.include_router(tpp_router.router, prefix="/tpp", tags=["TPP Runs"])
app.include_router(massage_router.router, prefix="/massage", tags=["Massage Runs"])
app.include_router(speed_router.router, prefix="/speed", tags=["Speed Runs"])
app.include_router(smt_hood_router.router, prefix="/smt-hood", tags=["SMT/Hood Runs"])

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({"ok": True, "docs": "/docs", "health": "/healthz"})

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=500)
apply_cors(app)

@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp

@app.get("/healthz")
def healthz():
    return {"ok": True}
