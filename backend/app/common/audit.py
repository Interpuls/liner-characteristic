import json
from typing import Any, Mapping, Optional

SENSITIVE_KEYS = {
    "password",
    "old_password",
    "new_password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "secret",
}

MAX_SERIALIZED_BYTES = 8_000  #hard limit to prevent huge rows/log spam


def _redact(obj: Any) -> Any:
    #Recursively redact sensitive keys in dict-like structures
    if isinstance(obj, Mapping):
        out = {}
        for k, v in obj.items():
            lk = str(k).lower()
            if lk in SENSITIVE_KEYS or "password" in lk or "token" in lk:
                out[k] = "***REDACTED***"
            else:
                out[k] = _redact(v)
        return out
    if isinstance(obj, list):
        return [_redact(x) for x in obj]
    return obj


def safe_json_snapshot(payload: Any) -> Optional[dict]:
    #Return a redacted, size-limited JSON snapshot suitable for storing in DB
    if payload is None:
        return None

    try:
        redacted = _redact(payload)
        raw = json.dumps(redacted, ensure_ascii=False, default=str).encode("utf-8")
        if len(raw) > MAX_SERIALIZED_BYTES:
            return {"_truncated": True, "size_bytes": len(raw)}
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"_unserializable": True, "type": str(type(payload))}
