from typing import Optional

import json
import logging
import os
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.model.user import User, UserRole, UnitSystem
from app.model.login_event import LoginEvent
from app.schema.user import UserCreate, UserRead
from app.schema.auth import Token

router = APIRouter()
logger = logging.getLogger("liner-backend.auth")


ALLOWED_EMAIL_DOMAIN = "milkrite-interpuls.com"  #eventualmente da spostare in un .env ??
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
FAILED_LOGIN_WINDOW_MINUTES = int(os.getenv("FAILED_LOGIN_WINDOW_MINUTES", "15"))
LOGIN_BLOCK_MINUTES = int(os.getenv("LOGIN_BLOCK_MINUTES", "15"))


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


def _request_ip(request: Request) -> str:
    xfwd = request.headers.get("x-forwarded-for")
    if xfwd:
        return xfwd.split(",")[0].strip()
    return request.client.host if request.client else "-"


def _best_effort_geo_from_headers(request: Request) -> tuple[Optional[str], Optional[str], Optional[str], Optional[float], Optional[float]]:
    # Works with common edge proxies/CDNs (Vercel/Cloudflare/etc.) when available.
    country = request.headers.get("x-vercel-ip-country") or request.headers.get("cf-ipcountry")
    region = request.headers.get("x-vercel-ip-country-region")
    city = request.headers.get("x-vercel-ip-city")
    lat_raw = request.headers.get("x-vercel-ip-latitude")
    lon_raw = request.headers.get("x-vercel-ip-longitude")
    try:
        lat = float(lat_raw) if lat_raw else None
    except ValueError:
        lat = None
    try:
        lon = float(lon_raw) if lon_raw else None
    except ValueError:
        lon = None
    return country, region, city, lat, lon


def _count_recent_failed_attempts(session: Session, email_attempted: str, ip: str, now: datetime) -> int:
    window_start = now - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)
    stmt = (
        select(LoginEvent)
        .where(LoginEvent.success.is_(False))
        .where(LoginEvent.created_at >= window_start)
        .where(LoginEvent.email_attempted == email_attempted)
        .where(LoginEvent.ip == ip)
    )
    return len(session.exec(stmt).all())


def _register_login_event(
    session: Session,
    request: Request,
    *,
    email_attempted: str,
    user_id: Optional[int],
    success: bool,
) -> None:
    try:
        ip = _request_ip(request)
        user_agent = request.headers.get("user-agent", "")
        request_id = request.headers.get("x-request-id") or str(uuid4())
        country, region, city, lat, lon = _best_effort_geo_from_headers(request)
        session.add(
            LoginEvent(
                user_id=user_id,
                email_attempted=email_attempted,
                success=success,
                ip=ip,
                user_agent=user_agent,
                country=country,
                region=region,
                city=city,
                lat=lat,
                lon=lon,
                request_id=request_id,
                created_at=datetime.utcnow(),
            )
        )
        session.commit()
    except Exception:
        session.rollback()
        logger.warning("Failed to persist login event", exc_info=True)


#Effettua il login e genera un token JWT
@router.post("/login", response_model=Token)
async def login(
    request: Request,
    creds: tuple[str, str] = Depends(_extract_credentials),
    session: Session = Depends(get_session),
):
    username, password = creds
    email_attempted = username.strip().lower()
    ip = _request_ip(request)
    now = datetime.utcnow()
    user = session.exec(select(User).where(User.email == email_attempted)).first()
    is_valid_credentials = bool(user and verify_password(password, user.hashed_password))

    if not is_valid_credentials:
        failed_recent = _count_recent_failed_attempts(session, email_attempted, ip, now)
        _register_login_event(
            session,
            request,
            email_attempted=email_attempted,
            user_id=getattr(user, "id", None),
            success=False,
        )
        if failed_recent + 1 >= MAX_FAILED_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Retry in {LOGIN_BLOCK_MINUTES} minutes.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    _register_login_event(
        session,
        request,
        email_attempted=email_attempted,
        user_id=user.id,
        success=True,
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
