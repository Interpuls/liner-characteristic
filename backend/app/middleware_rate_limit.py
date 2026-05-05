import logging
import re
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock

from starlette.responses import JSONResponse
from app.alerts import emit_alert


logger = logging.getLogger("liner-backend.ratelimit")


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    method: str
    path_regex: str
    max_requests: int
    window_seconds: int


DEFAULT_SENSITIVE_RATE_LIMIT_RULES = (
    RateLimitRule("auth_login", "POST", r"^/auth/login$", 15, 600),
    RateLimitRule("auth_register", "POST", r"^/auth/register$", 5, 3600),
    RateLimitRule("security_events", "GET", r"^/auth/security/(events|summary)$", 30, 300),
    RateLimitRule("setting_compare", "POST", r"^/setting-calculator/compare$", 30, 60),
    RateLimitRule("tpp_compute", "POST", r"^/tpp/runs/\d+/compute$", 20, 60),
    RateLimitRule("speed_compute", "POST", r"^/speed/runs/\d+/compute$", 20, 60),
    RateLimitRule("massage_compute", "POST", r"^/massage/runs/\d+/compute$", 20, 60),
    RateLimitRule("smt_hood_compute", "POST", r"^/smt-hood/runs/\d+/compute$", 20, 60),
    RateLimitRule("admin_news_write", "POST", r"^/news$", 30, 60),
    RateLimitRule("admin_news_update", "PUT", r"^/news/\d+$", 30, 60),
    RateLimitRule("admin_news_delete", "DELETE", r"^/news/\d+$", 20, 60),
    RateLimitRule("admin_product_create", "POST", r"^/products$", 30, 60),
    RateLimitRule("admin_product_update", "PUT", r"^/products/\d+$", 30, 60),
    RateLimitRule("admin_product_delete", "DELETE", r"^/products/\d+$", 20, 60),
    RateLimitRule("admin_kpi_write", "POST", r"^/kpis$", 20, 60),
    RateLimitRule("admin_kpi_delete", "DELETE", r"^/kpis/\d+$", 20, 60),
    RateLimitRule("admin_kpi_scales", "PUT", r"^/kpis/[^/]+/scales$", 20, 60),
)


def _scope_headers(scope) -> dict[str, str]:
    return {
        k.decode("latin-1").lower(): v.decode("latin-1")
        for k, v in scope.get("headers", [])
    }


def _request_ip_from_scope(scope) -> str:
    headers = _scope_headers(scope)
    forwarded = (
        headers.get("x-forwarded-for")
        or headers.get("x-real-ip")
        or headers.get("fly-client-ip")
    )
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = scope.get("client")
    return client[0] if client else "-"


class SensitiveRateLimitMiddleware:
    def __init__(self, app, *, rules: tuple[RateLimitRule, ...] | None = None):
        self.app = app
        self.rules = tuple(rules or DEFAULT_SENSITIVE_RATE_LIMIT_RULES)
        self.compiled_rules = [
            (rule, re.compile(rule.path_regex))
            for rule in self.rules
        ]
        self._hits: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()

    def _match_rule(self, method: str, path: str) -> RateLimitRule | None:
        normalized_method = (method or "").upper()
        for rule, pattern in self.compiled_rules:
            if rule.method == normalized_method and pattern.match(path):
                return rule
        return None

    def _allow(self, rule: RateLimitRule, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        window_start = now - rule.window_seconds
        bucket_key = (rule.name, key)
        with self._lock:
            hits = self._hits.setdefault(bucket_key, deque())
            while hits and hits[0] <= window_start:
                hits.popleft()
            if len(hits) >= rule.max_requests:
                retry_after = max(1, int(rule.window_seconds - (now - hits[0])))
                return False, retry_after
            hits.append(now)
            return True, 0

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "")
        rule = self._match_rule(method, path)
        if rule is None:
            await self.app(scope, receive, send)
            return

        ip = _request_ip_from_scope(scope)
        allowed, retry_after = self._allow(rule, ip)
        if not allowed:
            emit_alert(
                logger,
                alert_code="rate_limit_block",
                severity="medium",
                message="Sensitive endpoint rate limit exceeded",
                method=method,
                path=path,
                ip=ip,
                retry_after=retry_after,
            )
            logger.warning(
                "RATE_LIMIT_BLOCK rule=%s method=%s path=%s ip=%s retry_after=%s",
                rule.name,
                method,
                path,
                ip,
                retry_after,
            )
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded for {rule.name}. Retry in {retry_after} seconds."
                },
            )
            response.headers["Retry-After"] = str(retry_after)
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
