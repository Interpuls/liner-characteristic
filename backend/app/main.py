import time
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from sqlmodel import Session
from app.model.audit_log import AuditLog
from app.common.audit import safe_json_snapshot


from app.db import init_db, engine
from app.deps import apply_cors
from app.logging_config import (
    setup_logging,
    request_id_ctx,
    client_ctx,
    path_ctx,
    user_ctx,
)
from app.model.access_log import AccessLog

# Routers
from app.routers import (
    auth_router, user_router, product_router, product_application_router,
    kpi_router, ranking_router, tpp_router, massage_router, speed_router, smt_hood_router,
    news_router
)
from app.routers.setting_calculator import router as setting_calculator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


logger = setup_logging()
access_logger = logging.getLogger("liner-backend.access")
AUDIT_BODY_MAX_BYTES = 50 * 1024

app = FastAPI(
    title="Liner Characteristic API",
    version="1.0.0",
    description="Backend per la gestione delle caratteristiche dei liner e test KPI.",
    debug=False,
    lifespan=lifespan,
)

# Routers
app.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])
app.include_router(user_router.router, prefix="/users", tags=["Users"])
app.include_router(product_router.router, prefix="/products", tags=["Products"])
app.include_router(product_application_router.router, prefix="/products", tags=["Product Applications"])
app.include_router(kpi_router.router, prefix="/kpis", tags=["KPIs"])
app.include_router(ranking_router.router, prefix="/rankings", tags=["Rankings"])
app.include_router(tpp_router.router, prefix="/tpp", tags=["TPP Runs"])
app.include_router(massage_router.router, prefix="/massage", tags=["Massage Runs"])
app.include_router(speed_router.router, prefix="/speed", tags=["Speed Runs"])
app.include_router(smt_hood_router.router, prefix="/smt-hood", tags=["SMT/Hood Runs"])
app.include_router(news_router.router, prefix="/news", tags=["News"])
app.include_router(setting_calculator_router, prefix="/setting-calculator", tags=["Setting Calculator"])

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({"ok": True, "docs": "/docs", "health": "/healthz"})

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=500)
apply_cors(app)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Generate or propagate a request id
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    # Track context for logging (reset on exit)
    rid_token = request_id_ctx.set(request_id)
    xfwd = request.headers.get("x-forwarded-for")
    client_ip = xfwd.split(",")[0].strip() if xfwd else (request.client.host if request.client else "-")
    client_token = client_ctx.set(client_ip)
    path_token = path_ctx.set(request.url.path)
    user_token = user_ctx.set("-")
    start = time.perf_counter()

    # Capture request payload for auditing (only for state-changing methods)
    audit_payload = None
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        ctype = (request.headers.get("content-type") or "").lower()
        content_length_header = request.headers.get("content-length")
        try:
            content_length = int(content_length_header) if content_length_header else None
        except ValueError:
            content_length = None

        body_bytes = b""
        should_read_body = False
        if "multipart/form-data" in ctype:
            audit_payload = {
                "_skipped_multipart": True,
                "content_length": content_length,
            }
        elif "application/json" in ctype or "application/x-www-form-urlencoded" in ctype:
            if content_length is None:
                audit_payload = {
                    "_skipped_no_content_length": True,
                    "max_bytes": AUDIT_BODY_MAX_BYTES,
                }
            elif content_length > AUDIT_BODY_MAX_BYTES:
                audit_payload = {
                    "_truncated": True,
                    "content_length": content_length,
                    "max_bytes": AUDIT_BODY_MAX_BYTES,
                }
            else:
                should_read_body = True

        if should_read_body:
            try:
                # Starlette caches request.body(); we keep the explicit cache assignment
                # to avoid consuming the stream for downstream handlers in edge cases.
                body_bytes = await request.body()
                try:
                    request._body = body_bytes  # type: ignore[attr-defined]
                except Exception:
                    pass
            except Exception:
                body_bytes = b""

        if should_read_body and "application/json" in ctype:
            try:
                import json
                audit_payload = json.loads(body_bytes.decode() or "{}")
            except Exception:
                audit_payload = {"_invalid_json": True}
        elif should_read_body and "application/x-www-form-urlencoded" in ctype:
            try:
                from urllib.parse import parse_qs
                parsed = parse_qs(body_bytes.decode() if body_bytes else "")
                audit_payload = {k: "***REDACTED***" for k in parsed.keys()}
            except Exception:
                audit_payload = {"_form_read_failed": True}


    try:
        response = await call_next(request)
    except Exception:
        response = None
        raise
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        status_code = getattr(response, "status_code", 500)
        user_obj = getattr(request.state, "user", None)
        user_id = getattr(user_obj, "id", None)
        user_email = getattr(user_obj, "email", None)
        user_agent = request.headers.get("user-agent", "")

        # Keep logging context aware of authenticated user
        if user_email:
            try:
                user_ctx.set(user_email)
            except Exception:
                pass

        if response is not None:
            response.headers["X-Request-ID"] = request_id

        access_logger.info(
            "api_access method=%s path=%s status=%s user_id=%s ip=%s dur_ms=%.2f ua=%s",
            request.method,
            request.url.path,
            status_code,
            user_id,
            client_ip,
            duration_ms,
            user_agent,
        )

        try:
            with Session(engine, expire_on_commit=False) as session:
                log_row = AccessLog(
                    request_id=request_id,
                    user_id=user_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=status_code,
                    ip=client_ip,
                    user_agent=user_agent,
                    duration_ms=int(duration_ms),
                    created_at=datetime.utcnow(),
                )
                session.add(log_row)
                session.commit()
        except Exception:
            # Logging failures should never break the request lifecycle
            logger.warning("Failed to persist access log", exc_info=True)

        # Persist audit log for state-changing operations (best-effort)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            try:
                with Session(engine, expire_on_commit=False) as session:
                    session.add(
                        AuditLog(
                            request_id=request_id,
                            user_id=user_id,
                            method=request.method,
                            path=request.url.path,
                            status_code=status_code,
                            ip=client_ip,
                            user_agent=user_agent,
                            request_json=safe_json_snapshot(audit_payload),
                            duration_ms=int(duration_ms),
                            created_at=datetime.utcnow(),
                        )
                    )
                    session.commit()
            except Exception:
                logger.warning("Failed to persist audit log", exc_info=True)


        # Structured error logging after persistence attempt
        if response is None:
            logger.exception(
                "HTTP %s %s failed after %.2f ms",
                request.method,
                request.url.path,
                duration_ms,
            )

        user_ctx.reset(user_token)
        path_ctx.reset(path_token)
        client_ctx.reset(client_token)
        request_id_ctx.reset(rid_token)
    return response

@app.get("/healthz")
def healthz():
    return {"ok": True}
