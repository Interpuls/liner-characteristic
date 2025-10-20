from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from app.db import get_session
from app.auth import get_current_user, require_role
from app.model.user import User, UserRole
from app.schema.user import UserRead, UserCreate

router = APIRouter()


# -------------------- USERS ROUTES --------------------

#Restituisce i dati dell’utente autenticato
@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user

#Restituisce la lista di tutti gli utenti (solo per admin)
@router.get("/", response_model=List[UserRead])
def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),  
):  
    users = session.exec(select(User)).all()
    return users

#Restituisce i dettagli di un singolo utente(solo per admin)
@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

#Elimina un utente (solo admin)
@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return None
