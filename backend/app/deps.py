import os
from fastapi.middleware.cors import CORSMiddleware

def apply_cors(app):
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()

    origins = [o.strip() for o in origins_str.split(",") if o.strip()]

    kwargs = dict(
        allow_credentials = True,
        allow_methods = ["*"],
        allow_headers = ["*"],
    )

    if origin_regex:
        app.add_middleware(CORSMiddleware, allow_origin_regex=origin_regex, **kwargs)
    else:
        app.add_middleware(CORSMiddleware, allow_origins=origins, **kwargs)
    
    
