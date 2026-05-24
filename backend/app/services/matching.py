import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app import models
from backend.app.schemas import MatchRequestIn, MatchResponseOut, MatchResultOut
from backend.app.services.normalization import normalize_text, split_multi

DEFAULT_WEIGHTS = {
    "skill": 35.0,
    "comfort": 20.0,
    "industry": 15.0,
    "availability": 10.0,
    "region": 10.0,
    "desire": 10.0,
}


def score_availability(bandwidth: str) -> float:
    return {"Low": 100.0, "Medium": 62.0, "High": 24.0}.get(bandwidth, 62.0)


def score_desire(desire: str, stretch: bool) -> float:
    base = {
        "Actively seeking": 100.0,
        "Open selectively": 76.0,
        "Neutral": 48.0,
        "Limited interest": 18.0,
    }.get(desire, 48.0)
    return min(100.0, base + 16.0) if stretch else base


def days_since(value: datetime) -> int:
    compared = value if value.tzinfo else value.replace(tzinfo=UTC)
    return (datetime.now(UTC) - compared).days


def get_default_config(session: Session) -> models.ScoringConfig:
    config = session.scalar(select(models.ScoringConfig).where(models.ScoringConfig.name == "default"))
    if config:
        return config
    config = models.ScoringConfig(name="default")
    session.add(config)
    session.commit()
    session.refresh(config)
    return config


def weights_from_config(config: models.ScoringConfig, overrides: dict[str, float] | None = None) -> dict[str, float]:
    weights = {
        "skill": config.skill,
        "comfort": config.comfort,
        "industry": config.industry,
        "availability": config.availability,
        "region": config.region,
        "desire": config.desire,
    }
    if overrides:
        weights.update({key: float(value) for key, value in overrides.items() if key in weights})
    return weights


def skill_score(trainer: models.Trainer, topic: str) -> tuple[float, str | None]:
    topic_norm = topic.lower()
    topic_first = topic_norm.split()[0] if topic_norm else ""
    best: models.Skill | None = None
    for skill in trainer.skills:
        skill_name = skill.skill_name.lower()
        if topic_norm == skill_name or topic_norm in skill_name or skill_name in topic_norm:
            if best is None or skill.proficiency_level > best.proficiency_level:
                best = skill
    if best is not None:
        return float(best.proficiency_level * 20), best.skill_name

    for skill in trainer.skills:
        skill_name = skill.skill_name.lower()
        if topic_first and topic_first in skill_name:
            if best is None or skill.proficiency_level > best.proficiency_level:
                best = skill
    if best is None:
        return 10.0, None
    return float(best.proficiency_level * 20), best.skill_name


def comfort_score(trainer: models.Trainer, meeting_type: str | None) -> tuple[float, int | None]:
    if not meeting_type:
        return 70.0, None
    for comfort in trainer.comfort:
        if comfort.meeting_type.lower() == meeting_type.lower():
            return float(comfort.comfort_level * 20), comfort.comfort_level
    return 40.0, None


def industry_score(trainer: models.Trainer, industry: str | None) -> float:
    if not industry:
        return 60.0
    industry_norm = industry.lower()
    sectors = set()
    if trainer.preference:
        sectors.update(item.lower() for item in split_multi(trainer.preference.preferred_sectors))
    sectors.update(normalize_text(project.client_sector).lower() for project in trainer.projects if project.client_sector)
    return 100.0 if industry_norm in sectors else 24.0


def region_score(trainer: models.Trainer, region: str | None) -> float:
    if not region:
        return 70.0
    if trainer.region.lower() == region.lower():
        return 100.0
    if trainer.preference and trainer.preference.travel_preference == "Global":
        return 68.0
    return 34.0


def run_match(session: Session, request: MatchRequestIn) -> MatchResponseOut:
    config = get_default_config(session)
    weights = weights_from_config(config, request.weights)
    trainers = session.scalars(
        select(models.Trainer).options(
            selectinload(models.Trainer.skills),
            selectinload(models.Trainer.projects),
            selectinload(models.Trainer.comfort),
            selectinload(models.Trainer.preference),
        )
    ).all()

    persisted_request = models.MatchRequest(
        raw_request=request.request,
        topic=request.topic,
        meeting_type=request.meeting_type,
        industry=request.industry,
        region=request.region,
        language=request.language,
        stretch_mode=request.stretch_mode,
    )
    session.add(persisted_request)
    session.flush()

    scored: list[MatchResultOut] = []
    for trainer in trainers:
        if request.language:
            languages = {item.lower() for item in split_multi(trainer.languages)}
            if request.language.lower() not in languages:
                continue
        if request.seniority and trainer.seniority_level != request.seniority:
            continue

        skill_part, matched_skill = skill_score(trainer, request.topic)
        comfort_part, comfort_level = comfort_score(trainer, request.meeting_type)
        industry_part = industry_score(trainer, request.industry)
        availability_part = score_availability(trainer.bandwidth)
        region_part = region_score(trainer, request.region)
        desire_part = score_desire(
            trainer.preference.client_facing_desire if trainer.preference else "Neutral",
            request.stretch_mode or bool(trainer.preference and trainer.preference.stretch_interest),
        )

        components = {
            "skill": skill_part,
            "comfort": comfort_part,
            "industry": industry_part,
            "availability": availability_part,
            "region": region_part,
            "desire": desire_part,
        }
        total_weight = sum(weights.values()) or 1.0
        weighted_total = sum(components[key] * (weights[key] / 100.0) for key in weights)
        validation_bonus = -4 if trainer.validation_status == "Self-declared" else 4
        stale_penalty = 5 if days_since(trainer.last_updated_at) > 60 else 0
        score = max(0, min(100, round((weighted_total / total_weight) * 100 + validation_bonus - stale_penalty)))

        reasons = [
            f"{matched_skill} depth matched" if matched_skill else "Partial topic match only",
            f"{request.meeting_type} comfort rated {comfort_level}/5" if request.meeting_type and comfort_level else "Broad meeting comfort available",
            f"{request.industry} evidence present" if request.industry and industry_part > 80 else f"{trainer.region} coverage",
        ]
        caveats = []
        if trainer.bandwidth == "High":
            caveats.append("High current project load")
        if trainer.validation_status == "Self-declared":
            caveats.append("Readiness needs validation")
        if request.meeting_type and comfort_level is not None and comfort_level <= 2:
            caveats.append("Should not lead this meeting type alone")
        if days_since(trainer.last_updated_at) > 60:
            caveats.append("Profile is stale")

        scored.append(
            MatchResultOut(
                trainer_id=trainer.id,
                full_name=trainer.full_name,
                region=trainer.region,
                role_title=trainer.role_title,
                score=score,
                reasons=reasons,
                caveats=caveats,
                components=components,
            )
        )

    scored.sort(key=lambda item: item.score, reverse=True)
    for rank, result in enumerate(scored, start=1):
        persisted_request.results.append(
            models.MatchResult(
                trainer_id=result.trainer_id,
                rank=rank,
                score=result.score,
                reasons=json.dumps(result.reasons),
                caveats=json.dumps(result.caveats),
                components_json=json.dumps(result.components),
            )
        )
    session.commit()
    session.refresh(persisted_request)
    return MatchResponseOut(request_id=persisted_request.id, results=scored)
