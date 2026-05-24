from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app import models
from backend.app.schemas import CoverageCellOut, CoverageOut, CoverageRowOut
from backend.app.services.normalization import REGION_ORDER
from backend.app.services.skill_catalog import CATEGORY_SKILLS


def coverage_summary(session: Session) -> CoverageOut:
    trainers = session.scalars(select(models.Trainer).options(selectinload(models.Trainer.skills))).all()
    catalog_topics = list(dict.fromkeys(skill for skills in CATEGORY_SKILLS.values() for skill in skills))
    additional_topics = sorted(
        {
            skill.skill_name
            for trainer in trainers
            for skill in trainer.skills
            if skill.skill_name not in catalog_topics
        }
    )
    topics = catalog_topics + additional_topics
    regions = list(REGION_ORDER)
    rows: list[CoverageRowOut] = []

    for topic in topics:
        cells: list[CoverageCellOut] = []
        for region in regions:
            regional = [trainer for trainer in trainers if trainer.region == region]
            matched_trainers = [
                (
                    trainer.full_name,
                    max(skill.proficiency_level for skill in trainer.skills if skill.skill_name == topic),
                )
                for trainer in regional
                if any(skill.skill_name == topic for skill in trainer.skills)
            ]
            levels = [level for _, level in matched_trainers]
            trainer_names = sorted(name for name, _ in matched_trainers)
            cells.append(
                CoverageCellOut(
                    region=region,
                    best=max(levels) if levels else 0,
                    count=len(trainer_names),
                    trainer_names=trainer_names,
                )
            )
        rows.append(CoverageRowOut(topic=topic, cells=cells))

    return CoverageOut(rows=rows)
