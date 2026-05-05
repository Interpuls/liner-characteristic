import logging
import os
import json
from contextvars import ContextVar
from logging.config import dictConfig

# Context variables populated per-request by middleware
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
client_ctx: ContextVar[str] = ContextVar("client", default="-")
path_ctx: ContextVar[str] = ContextVar("path", default="-")
user_ctx: ContextVar[str] = ContextVar("user", default="-")


class RequestContextFilter(logging.Filter):
    """Attach request-scoped data (set via ContextVars) to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        record.client = client_ctx.get()
        record.path = path_ctx.get()
        record.user = user_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "client": getattr(record, "client", "-"),
            "path": getattr(record, "path", "-"),
            "user": getattr(record, "user", "-"),
        }

        for key in ("alert_code", "severity", "event_type", "status_code", "method", "ip", "retry_after"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=True)


def setup_logging() -> logging.Logger:
    """Configure application-wide logging early in startup."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "text").strip().lower()
    fmt = (
        "%(asctime)s %(levelname)s %(name)s "
        "request_id=%(request_id)s client=%(client)s path=%(path)s user=%(user)s "
        "%(message)s"
    )
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "request_context": {
                    "()": RequestContextFilter,
                }
            },
            "formatters": {
                "default": {
                    "format": fmt,
                },
                "json": {
                    "()": JsonFormatter,
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "json" if log_format == "json" else "default",
                    "filters": ["request_context"],
                },
            },
            "root": {"handlers": ["default"], "level": log_level},
            "loggers": {
                # Keep uvicorn in sync with our app logger to avoid noisy double logs
                "uvicorn": {"handlers": ["default"], "level": log_level, "propagate": False},
                "uvicorn.error": {"handlers": ["default"], "level": log_level, "propagate": False},
                "uvicorn.access": {"handlers": ["default"], "level": log_level, "propagate": False},
                "liner-backend": {"handlers": ["default"], "level": log_level, "propagate": False},
                "liner-backend.db": {"handlers": ["default"], "level": log_level, "propagate": False},
                # Let access logger behave like liner-backend.auth: inherit and propagate to parent.
                "liner-backend.access": {"level": "NOTSET", "propagate": True},
            },
        }
    )
    return logging.getLogger("liner-backend")
