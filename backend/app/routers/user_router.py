import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete
from typing import List
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import get_current_user, require_role, create_access_token, verify_password, hash_password
from app.model.user import User, UserRole
from app.model.login_event import LoginEvent
from app.model.security_event import SecurityEvent
from app.model.audit_log import AuditLog
from app.model.access_log import AccessLog
from app.model.setting_comparison_preference import SettingComparisonPreference
from app.model.search import SearchPreference
from app.schema.user import (
    UserRead,
    UserUpdate,
    UserUpdateResponse,
    UserPasswordUpdate,
    AdminUserPasswordReset,
)

router = APIRouter()
logger = logging.getLogger("liner-backend")


# -------------------- USERS ROUTES --------------------

#Restituisce i dati dell’utente autenticato
@router.get("/me", response_model=UserRead)
@convert_output
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/password", status_code=204)
def change_my_password(
    payload: UserPasswordUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not payload.current_password or not payload.new_password:
        raise HTTPException(status_code=400, detail="Both current_password and new_password are required")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is invalid")

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.is_first_login = False
    session.add(current_user)
    session.commit()
    return None


@router.put("/{user_id}/password-reset", status_code=204)
def reset_user_password(
    user_id: int,
    payload: AdminUserPasswordReset,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.new_password:
        raise HTTPException(status_code=400, detail="new_password is required")

    user.hashed_password = hash_password(payload.new_password)
    user.is_first_login = True
    session.add(user)
    session.commit()
    return None

#Restituisce la lista di tutti gli utenti (solo per admin)
@router.get("/", response_model=List[UserRead])
@convert_output
def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),  
):  
    users = session.exec(select(User)).all()
    return users

#Restituisce i dettagli di un singolo utente(solo per admin)
@router.get("/{user_id}", response_model=UserRead)
@convert_output
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

#Aggiorna lo unit_system dello user
@router.put("/{user_id}", response_model=UserUpdateResponse)
@convert_output
def update_user(
    user_id: int,
    payload: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    #Consente l'aggiornamento solo all'admin o al proprietario del profilo
    current_role = getattr(current_user.role, "value", current_user.role)
    if current_user.id != user_id and current_role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Forbidden")

    if payload.unit_system is None:
        raise HTTPException(status_code=400, detail="No updates provided")

    #Aggiorna le preferenze
    user.unit_system = payload.unit_system
    session.add(user)
    session.commit()
    session.refresh(user)

    #Genera un nuovo token solo per l'utente che aggiorna il proprio profilo
    new_token = None
    if current_user.id == user_id:
        role_value = getattr(user.role, "value", user.role)
        unit_value = getattr(user.unit_system, "value", user.unit_system)
        new_token = create_access_token(sub=user.email, role=role_value, unit_system=unit_value)

    return UserUpdateResponse(
        user=user,
        access_token=new_token,
        unit_system=getattr(user.unit_system, "value", user.unit_system),
    )

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

    try:
        # Remove all user-owned records first to avoid foreign-key constraint failures
        logger.info(f"Deleting related records for user_id={user_id}")
        
        deleted = session.exec(delete(LoginEvent).where(LoginEvent.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} LoginEvent records")
        
        deleted = session.exec(delete(SecurityEvent).where(SecurityEvent.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} SecurityEvent records")
        
        deleted = session.exec(delete(AuditLog).where(AuditLog.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} AuditLog records")
        
        deleted = session.exec(delete(AccessLog).where(AccessLog.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} AccessLog records")
        
        deleted = session.exec(delete(SettingComparisonPreference).where(SettingComparisonPreference.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} SettingComparisonPreference records")
        
        deleted = session.exec(delete(SearchPreference).where(SearchPreference.user_id == user_id)).rowcount
        logger.debug(f"Deleted {deleted} SearchPreference records")

        logger.info(f"Deleting user with id={user_id}")
        session.delete(user)
        session.commit()
        logger.info(f"Successfully deleted user with id={user_id}")
    except Exception as exc:
        session.rollback()
        print(f"Exception in delete_user for user_id={user_id}: {str(exc)}", flush=True)
        logger.exception(f"delete_user failed for user_id={user_id}: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(exc)}") from exc
    return None
