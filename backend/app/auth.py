import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status, Depends
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.model.user import User
from .schema.auth import TokenData
from .db import get_session

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# Support long passwords safely, while still verifying old bcrypt hashes
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    # For safety: never raise on >72 bytes when verifying old bcrypt; truncate instead
    bcrypt__truncate_error=False,
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def now_utc():
    return datetime.utcnow()

def create_access_token(sub: str, role: str) -> str:
    to_encode = {"sub": sub, "role": role, "exp": now_utc() + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    cred_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials", headers={"WWW-Authenticate":"Bearer"})
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if sub is None or role is None:
            raise cred_exc
        token_data = TokenData(sub=sub, role=role)
    except JWTError:
        raise cred_exc

    user = session.exec(select(User).where(User.email == token_data.sub)).first()
    if not user or not user.is_active:
        raise cred_exc
    return user

def require_role(required: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        role_value = getattr(user.role, "value", user.role)
        if role_value != required:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker
