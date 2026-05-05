import os
from fastapi.middleware.cors import CORSMiddleware


def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


def apply_cors(app):
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()

    origins = [_normalize_origin(o) for o in origins_str.split(",") if _normalize_origin(o)]
    has_wildcard_origin = "*" in origins

    kwargs = dict(
        allow_methods = ["*"],
        allow_headers = ["*"],
    )

    if origin_regex:
        kwargs["allow_credentials"] = True
        app.add_middleware(CORSMiddleware, allow_origin_regex=origin_regex, **kwargs)
    elif has_wildcard_origin:
        kwargs["allow_credentials"] = False
        app.add_middleware(CORSMiddleware, allow_origins=["*"], **kwargs)
    else:
        kwargs["allow_credentials"] = True
        app.add_middleware(CORSMiddleware, allow_origins=origins, **kwargs)
    
    
