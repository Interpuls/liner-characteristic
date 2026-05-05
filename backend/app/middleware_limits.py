import asyncio
import logging

from starlette.responses import JSONResponse
from app.alerts import emit_alert


logger = logging.getLogger("liner-backend.limits")


class PayloadTooLargeError(Exception):
    pass


class RequestSizeLimitMiddleware:
    def __init__(self, app, *, max_body_bytes: int):
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            k.decode("latin-1").lower(): v.decode("latin-1")
            for k, v in scope.get("headers", [])
        }
        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_bytes:
                    await JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body too large. Max allowed is {self.max_body_bytes} bytes."
                        },
                    )(scope, receive, send)
                    return
            except ValueError:
                pass

        total_bytes = 0

        async def limited_receive():
            nonlocal total_bytes
            message = await receive()
            if message["type"] == "http.request":
                total_bytes += len(message.get("body", b""))
                if total_bytes > self.max_body_bytes:
                    raise PayloadTooLargeError()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except PayloadTooLargeError:
            await JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body too large. Max allowed is {self.max_body_bytes} bytes."
                },
            )(scope, receive, send)


class RequestTimeoutMiddleware:
    def __init__(self, app, *, timeout_seconds: float):
        self.app = app
        self.timeout_seconds = timeout_seconds

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def tracked_send(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await asyncio.wait_for(
                self.app(scope, receive, tracked_send),
                timeout=self.timeout_seconds,
            )
        except TimeoutError:
            emit_alert(
                logger,
                alert_code="request_timeout",
                severity="medium",
                message="Request processing timed out",
                path=scope.get("path", "-"),
                timeout_seconds=self.timeout_seconds,
            )
            logger.warning(
                "Request timeout path=%s timeout_seconds=%s",
                scope.get("path", "-"),
                self.timeout_seconds,
            )
            if not response_started:
                await JSONResponse(
                    status_code=504,
                    content={"detail": "Request processing timed out."},
                )(scope, receive, send)
