from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_session
from backend.app.schemas import CoverageOut
from backend.app.services.analytics import coverage_summary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/coverage", response_model=CoverageOut)
def get_coverage(session: Session = Depends(get_session)) -> CoverageOut:
    return coverage_summary(session)
