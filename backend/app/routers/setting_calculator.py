from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from sqlmodel import select

from app.db import get_session
from app.auth import get_current_user

from app.schema.setting_calculator.request_v1 import CompareRequestV1
from app.schema.setting_calculator.response_v1 import CompareResponseV1
from app.schema.setting_calculator.preferences import (
    SettingComparisonPreferenceIn,
    SettingComparisonPreferenceOut,
)
from app.model.setting_comparison_preference import SettingComparisonPreference
from app.services.setting_calculator import compare_settings_v1


router = APIRouter()


@router.post(
    "/compare",
    response_model=CompareResponseV1,
)
def compare_settings(
    payload: CompareRequestV1,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Compare two liner configurations and return charts + derived metrics.
    """
    return compare_settings_v1(session, payload)


@router.get("/preferences", response_model=List[SettingComparisonPreferenceOut])
def list_setting_comparison_prefs(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    q = (
        select(SettingComparisonPreference)
        .where(SettingComparisonPreference.user_id == user.id)
        .order_by(SettingComparisonPreference.created_at.desc())
    )
    return session.exec(q).all()


@router.post("/preferences", response_model=SettingComparisonPreferenceOut)
def save_setting_comparison_pref(
    payload: SettingComparisonPreferenceIn,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    existing = session.exec(
        select(SettingComparisonPreference).where(
            SettingComparisonPreference.user_id == user.id,
            SettingComparisonPreference.name == payload.name,
        )
    ).first()
    if existing:
        existing.payload = payload.payload
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    pref = SettingComparisonPreference(
        user_id=user.id,
        name=payload.name,
        payload=payload.payload,
    )
    session.add(pref)
    session.commit()
    session.refresh(pref)
    return pref


@router.delete("/preferences/{pref_id}", status_code=204)
def delete_setting_comparison_pref_by_id(
    pref_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    pref = session.exec(
        select(SettingComparisonPreference).where(
            SettingComparisonPreference.id == pref_id,
            SettingComparisonPreference.user_id == user.id,
        )
    ).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    session.delete(pref)
    session.commit()
    return


@router.delete("/preferences", status_code=204)
def delete_setting_comparison_pref_by_name(
    name: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    pref = session.exec(
        select(SettingComparisonPreference).where(
            SettingComparisonPreference.user_id == user.id,
            SettingComparisonPreference.name == name,
        )
    ).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    session.delete(pref)
    session.commit()
    return
