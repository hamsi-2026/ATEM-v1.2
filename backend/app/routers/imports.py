from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from backend.app.database import get_session
from backend.app.schemas import ImportErrorOut, ImportResultOut
from backend.app.services.imports import import_trainers

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/trainers", response_model=ImportResultOut)
async def upload_trainers(file: UploadFile = File(...), session: Session = Depends(get_session)) -> ImportResultOut:
    batch = await import_trainers(session, file)
    return ImportResultOut(
        batch_id=batch.id,
        created_count=batch.created_count,
        updated_count=batch.updated_count,
        error_count=batch.error_count,
        errors=[
            ImportErrorOut(row_number=error.row_number, field=error.field, message=error.message)
            for error in batch.errors
        ],
    )
