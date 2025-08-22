import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from .db import init_db, get_session
from .models import User, Liner
from .schemas import UserCreate, UserOut, Token, LinerIn
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors

import logging

from starlette.middleware.gzip import GZipMiddleware

ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "milkrite.com")

app = FastAPI(title="Liner Characteristic API")

app.add_middleware(GZipMiddleware, minimum_size=500)

apply_cors(app)

@app.on_event("startup")
def on_startup():
    init_db()

# -------- Middleware --------
@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp

# -------- Auth --------
@app.post("/auth/register", response_model=UserOut)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    # consenti solo email del dominio aziendale
    if not payload.email.endswith(f"@{ALLOWED_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail="Email domain not allowed")

    exists = session.exec(select(User).where(User.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(email=payload.email, hashed_password=hash_password(payload.password), role=payload.role or "user")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.email, role=user.role)
    return Token(access_token=token)

# -------- Users (me) --------
@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, role=user.role)

# -------- Liners --------
@app.get("/liners")
def list_liners(session: Session = Depends(get_session), user=Depends(get_current_user)):
    return session.exec(select(Liner)).all()

@app.post("/liners", dependencies=[Depends(require_role("admin"))])
def create_liner(payload: LinerIn, session: Session = Depends(get_session)):
    liner = Liner(**payload.dict())
    session.add(liner)
    session.commit()
    session.refresh(liner)
    return liner

@app.get("/liners/{liner_id}")
def get_liner(liner_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    liner = session.get(Liner, liner_id)
    if not liner:
        raise HTTPException(status_code=404, detail="Not found")
    return liner

@app.put("/liners/{liner_id}", dependencies=[Depends(require_role("admin"))])
def update_liner(liner_id: int, payload: LinerIn, session: Session = Depends(get_session)):
    liner = session.get(Liner, liner_id)
    if not liner:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict().items():
        setattr(liner, k, v)
    session.add(liner)
    session.commit()
    session.refresh(liner)
    return liner

@app.delete("/liners/{liner_id}", dependencies=[Depends(require_role("admin"))], status_code=204)
def delete_liner(liner_id: int, session: Session = Depends(get_session)):
    liner = session.get(Liner, liner_id)
    if not liner:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(liner)
    session.commit()
    return

@app.get("/healthz")
def healthz():
    return {"ok": True}