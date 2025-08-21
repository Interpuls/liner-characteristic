import os
from fastapi.middleware.cors import CORSMiddleware

def apply_cors(app):
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origins = [o.strip() for o in origins_str.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
