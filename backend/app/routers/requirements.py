from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from backend.app.database import get_session
from backend.app.schemas import RequirementCompareOut
from backend.app.services.requirements import compare_requirement

router = APIRouter(prefix="/requirements", tags=["requirements"])


@router.post("/compare", response_model=RequirementCompareOut)
async def upload_requirement(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> RequirementCompareOut:
    return await compare_requirement(session, file)
