from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.auth import get_current_user

from app.schema.setting_calculator.request_v1 import CompareRequestV1
from app.schema.setting_calculator.response_v1 import CompareResponseV1
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
