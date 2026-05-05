from starlette.requests import Request

from app.routers import auth_router
from app.routers.auth_router import _emit_fail2ban_auth_event


def build_request(headers=None, client=("203.0.113.10", 12345)):
    raw_headers = [
        (k.lower().encode("latin-1"), v.encode("latin-1"))
        for k, v in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/auth/login",
        "headers": raw_headers,
        "client": client,
    }
    return Request(scope)


def test_fail2ban_log_line_uses_forwarded_ip(monkeypatch):
    request = build_request(headers={"x-forwarded-for": "198.51.100.77"})
    calls = []

    def fake_warning(message, *args, **kwargs):
        calls.append((message, args, kwargs))

    monkeypatch.setattr(auth_router.logger, "warning", fake_warning)

    _emit_fail2ban_auth_event(
        request,
        reason="invalid_credentials",
        email_attempted="user@example.com",
        user_id=None,
        failed_attempts=3,
        threshold=10,
    )

    assert len(calls) == 1
    message, args, kwargs = calls[0]
    assert kwargs == {}
    assert message == "FAIL2BAN_AUTH event=login_failure reason=%s ip=%s email=%s user_id=%s attempts=%s threshold=%s"
    assert args == (
        "invalid_credentials",
        "198.51.100.77",
        "user@example.com",
        "-",
        3,
        10,
    )
