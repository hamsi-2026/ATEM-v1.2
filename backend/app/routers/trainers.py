from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app import models
from backend.app.database import get_session
from backend.app.schemas import TrainerDetailOut, TrainerListOut

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("", response_model=list[TrainerListOut])
def list_trainers(session: Session = Depends(get_session)) -> list[models.Trainer]:
    return list(session.scalars(select(models.Trainer).order_by(models.Trainer.full_name)).all())


@router.get("/{trainer_id}", response_model=TrainerDetailOut)
def get_trainer(trainer_id: int, session: Session = Depends(get_session)) -> models.Trainer:
    trainer = session.scalar(
        select(models.Trainer)
        .where(models.Trainer.id == trainer_id)
        .options(
            selectinload(models.Trainer.skills),
            selectinload(models.Trainer.projects),
            selectinload(models.Trainer.comfort),
            selectinload(models.Trainer.preference),
        )
    )
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer
