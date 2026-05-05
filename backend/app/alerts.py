import logging


def emit_alert(
    logger: logging.Logger,
    *,
    alert_code: str,
    severity: str,
    message: str,
    **fields,
) -> None:
    extra = {
        "alert_code": alert_code,
        "severity": severity,
        "event_type": "alert",
    }
    extra.update(fields)

    level = logging.ERROR if severity.lower() in {"high", "critical"} else logging.WARNING
    logger.log(level, message, extra=extra)
