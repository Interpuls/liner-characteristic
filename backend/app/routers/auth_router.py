from typing import Optional

import json

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.model.user import User, UserRole, UnitSystem
from app.schema.user import UserCreate, UserRead
from app.schema.auth import Token

router = APIRouter()


ALLOWED_EMAIL_DOMAIN = "milkrite-interpuls.com"  #eventualmente da spostare in un .env ??


# ---------------- AUTH ENDPOINTS ----------------

@router.post("/register", response_model=UserRead)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    #Crea un nuovo utente (registrazione).
    #Consente solo indirizzi email aziendali.
    if not payload.email.endswith(f"@{ALLOWED_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail="Email domain not allowed")

    exists = session.exec(select(User).where(User.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role or UserRole.USER,
        unit_system=payload.unit_system or UnitSystem.metric,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# Helper: accetta sia JSON che form-url-encoded; legge il raw body una sola volta
async def _extract_credentials(request: Request) -> tuple[str, str]:
    ctype = (request.headers.get("content-type") or "").lower()
    username: Optional[str] = None
    password: Optional[str] = None

    # Leggi il body (cached se già consumato da middleware)
    try:
        raw = await request.body()
    except Exception:
        raw = b""
    # DEBUG TEMP: log contenuto body e headers
    try:
        import logging
        logging.getLogger("liner-backend.auth").info(
            "login: ctype=%s len(raw)=%s", ctype, len(raw)
        )
    except Exception:
        pass

    # 1) prova JSON se header indica json
    if raw and "application/json" in ctype:
        try:
            data = json.loads(raw.decode() or "{}")
        except Exception:
            data = {}
        username = data.get("username") or data.get("email")
        password = data.get("password")

    # 2) prova querystring parsing (valido per x-www-form-urlencoded)
    if raw and (not username or not password):
        try:
            from urllib.parse import parse_qs
            parsed = {k: v[0] for k, v in parse_qs(raw.decode()).items() if v}
            username = username or parsed.get("username") or parsed.get("email")
            password = password or parsed.get("password")
        except Exception:
            pass

    # 3) extrema ratio: prova anche request.form (multipart)
    if not username or not password:
        try:
            form = await request.form()
            try:
                import logging
                logging.getLogger("liner-backend.auth").info(
                    "login: form keys=%s", list(form.keys())
                )
            except Exception:
                pass
            username = username or form.get("username") or form.get("email")
            password = password or form.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing username/password",
        )
    return username, password


#Effettua il login e genera un token JWT
@router.post("/login", response_model=Token)
async def login(
    request: Request,
    creds: tuple[str, str] = Depends(_extract_credentials),
    session: Session = Depends(get_session),
):
    username, password = creds
    user = session.exec(select(User).where(User.email == username)).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    role_value = getattr(user.role, "value", user.role)
    unit_pref = getattr(user, "unit_system", UnitSystem.metric)
    unit_system_value = getattr(unit_pref, "value", unit_pref) or UnitSystem.metric
    token = create_access_token(sub=user.email, role=role_value, unit_system=unit_system_value)
    return Token(access_token=token, unit_system=unit_system_value)

    
#Restituisce le informazioni dell’utente autenticato.
@router.get("/me", response_model=UserRead)
@convert_output
def me(user: User = Depends(get_current_user)):
    return user
