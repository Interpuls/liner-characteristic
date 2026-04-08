from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.auth import get_current_user
from app.db import get_session
from app.services.ranking import get_overview_rankings

router = APIRouter()


@router.get("/overview", response_model=dict)
def overview_rankings(
    kpis: str = Query(
        "CLOSURE,FITTING,CONGESTION_RISK,HYPERKERATOSIS_RISK,SPEED,RESPRAY,FLUYDODINAMIC,SLIPPAGE,RINGING_RISK"
    ),
    teat_sizes: str = Query("XS,S,M,L"),
    reference_areas: str = Query("Global"),
    limit: int = Query(5, ge=1, le=5),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return get_overview_rankings(
        session=session,
        user=user,
        kpis=kpis,
        teat_sizes=teat_sizes,
        reference_areas=reference_areas,
        limit=limit,
    )
