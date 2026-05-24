from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app import models
from backend.app.schemas import CoverageCellOut, CoverageOut, CoverageRowOut


def coverage_summary(session: Session) -> CoverageOut:
    trainers = session.scalars(select(models.Trainer).options(selectinload(models.Trainer.skills))).all()
    topics = sorted({skill.skill_name for trainer in trainers for skill in trainer.skills})
    regions = sorted({trainer.region for trainer in trainers})
    rows: list[CoverageRowOut] = []

    for topic in topics:
        cells: list[CoverageCellOut] = []
        for region in regions:
            regional = [trainer for trainer in trainers if trainer.region == region]
            matches = [
                skill.proficiency_level
                for trainer in regional
                for skill in trainer.skills
                if skill.skill_name == topic
            ]
            cells.append(CoverageCellOut(region=region, best=max(matches) if matches else 0, count=len(matches)))
        rows.append(CoverageRowOut(topic=topic, cells=cells))

    return CoverageOut(rows=rows)
