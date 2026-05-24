from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_session
from backend.app.schemas import MatchRequestIn, MatchResponseOut
from backend.app.services.matching import run_match

router = APIRouter(tags=["matching"])


@router.post("/match", response_model=MatchResponseOut)
def match_trainers(request: MatchRequestIn, session: Session = Depends(get_session)) -> MatchResponseOut:
    return run_match(session, request)
