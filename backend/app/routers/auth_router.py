from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.model.user import User, UserRole, UnitSystem
from app.schema.user import UserCreate, UserRead
from app.schema.auth import Token

router = APIRouter()


ALLOWED_EMAIL_DOMAIN = "milkrite.com"  #eventualmente da spostare in un .env ??


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

#Effettua il login e genera un token JWT
@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
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
