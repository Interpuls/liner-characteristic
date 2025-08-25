import os
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from starlette.middleware.gzip import GZipMiddleware

from .db import init_db, get_session
from .models import User, Product
from .schemas import UserCreate, UserOut, Token, ProductIn, ProductOut
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from .deps import apply_cors

ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "milkrite.com")

app = FastAPI(title="Liner Characteristic API")

logger = logging.getLogger("liner-backend")
logging.basicConfig(level=logging.INFO)

app.add_middleware(GZipMiddleware, minimum_size=500)

apply_cors(app)

@app.on_event("startup")
def on_startup():
    init_db()

# -------------------------- Routes ----------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({"ok": True, "docs": "/docs", "health": "/healthz"})


# ------------------------- Middleware -------------------------------------------

@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp


# --------------------------- Auth ----------------------------------------------

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


# --------------------------- Users (me) ---------------------------------------

@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, role=user.role)


# ---------------------------- Health ------------------------------------------

@app.get("/healthz")
def healthz():
    return {"ok": True}


# ---------------------------- Products ----------------------------------------

@app.get("/products", response_model=list[ProductOut])
def list_products(session: Session = Depends(get_session), user=Depends(get_current_user)):
    return session.exec(select(Product)).all()


@app.post("/products", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def create_product(payload: ProductIn, session: Session = Depends(get_session)):
    exists = session.exec(select(Product).where(Product.code == payload.code)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Product code already exists")
    obj = Product(code=payload.code, name=payload.name, description=payload.description)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj


@app.put("/products/{product_id}", response_model=ProductOut, dependencies=[Depends(require_role("admin"))])
def update_product(product_id: int, payload: ProductIn, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    # se cambia il code, verifica unicità
    if obj.code != payload.code:
        exists = session.exec(select(Product).where(Product.code == payload.code)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Product code already exists")
    obj.code = payload.code
    obj.name = payload.name
    obj.description = payload.description
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@app.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_role("admin"))])
def delete_product(product_id: int, session: Session = Depends(get_session)):
    obj = session.get(Product, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return



# ---------------------------- Test Types --------------------------------------

