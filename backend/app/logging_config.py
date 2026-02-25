import logging
import os
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


def setup_logging() -> logging.Logger:
    """Configure application-wide logging early in startup."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
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
                }
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
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
                "liner-backend.access": {"handlers": ["default"], "level": log_level, "propagate": False},
            },
        }
    )
    return logging.getLogger("liner-backend")
