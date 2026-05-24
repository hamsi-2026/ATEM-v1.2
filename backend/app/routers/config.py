from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app import models
from backend.app.database import get_session
from backend.app.schemas import ScoringConfigIn, ScoringConfigOut, SkillCatalogCategoryOut
from backend.app.services.matching import get_default_config
from backend.app.services.skill_catalog import skill_catalog_groups

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/scoring", response_model=ScoringConfigOut)
def get_scoring_config(session: Session = Depends(get_session)) -> models.ScoringConfig:
    return get_default_config(session)


@router.put("/scoring", response_model=ScoringConfigOut)
def update_scoring_config(payload: ScoringConfigIn, session: Session = Depends(get_session)) -> models.ScoringConfig:
    config = get_default_config(session)
    config.skill = payload.skill
    config.comfort = payload.comfort
    config.industry = payload.industry
    config.availability = payload.availability
    config.region = payload.region
    config.desire = payload.desire
    session.commit()
    session.refresh(config)
    return config


@router.get("/skill-catalog", response_model=list[SkillCatalogCategoryOut])
def get_skill_catalog() -> list[dict[str, object]]:
    return skill_catalog_groups()
