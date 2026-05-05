import json
import logging

from app.alerts import emit_alert
from app.logging_config import JsonFormatter


def test_json_formatter_outputs_structured_alert():
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="liner-backend.test",
        level=logging.ERROR,
        pathname=__file__,
        lineno=10,
        msg="backend failure",
        args=(),
        exc_info=None,
    )
    record.request_id = "req-1"
    record.client = "203.0.113.10"
    record.path = "/auth/login"
    record.user = "admin@example.com"
    record.alert_code = "http_5xx"
    record.severity = "high"
    record.event_type = "alert"

    payload = json.loads(formatter.format(record))

    assert payload["message"] == "backend failure"
    assert payload["request_id"] == "req-1"
    assert payload["client"] == "203.0.113.10"
    assert payload["path"] == "/auth/login"
    assert payload["user"] == "admin@example.com"
    assert payload["alert_code"] == "http_5xx"
    assert payload["severity"] == "high"
    assert payload["event_type"] == "alert"


def test_emit_alert_sets_structured_fields(monkeypatch):
    calls = []
    logger = logging.getLogger("liner-backend.test")

    def fake_log(level, message, extra=None):
        calls.append((level, message, extra))

    monkeypatch.setattr(logger, "log", fake_log)

    emit_alert(
        logger,
        alert_code="request_timeout",
        severity="medium",
        message="Request timed out",
        timeout_seconds=60,
    )

    assert len(calls) == 1
    level, message, extra = calls[0]
    assert level == logging.WARNING
    assert message == "Request timed out"
    assert extra["alert_code"] == "request_timeout"
    assert extra["severity"] == "medium"
    assert extra["event_type"] == "alert"
    assert extra["timeout_seconds"] == 60
