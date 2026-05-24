import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app import models
from backend.app.services.normalization import (
    MEETING_TYPES,
    REGIONS,
    normalize_key,
    normalize_name,
    normalize_text,
    parse_bool,
    parse_datetime,
    parse_int,
    split_multi,
)


class ImportRowProblem(Exception):
    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message


def parse_skills(value: object) -> list[dict[str, Any]]:
    items = split_multi(value)
    skills: list[dict[str, Any]] = []
    for item in items:
        name = item
        level = 3
        if ":" in item:
            name, rating = item.rsplit(":", 1)
            level = parse_int(rating)
        skills.append(
            {
                "skill_name": normalize_text(name),
                "skill_category": "Imported",
                "proficiency_level": level,
                "evidence_type": "Import",
                "evidence_note": "Imported from trainer spreadsheet",
            }
        )
    return [skill for skill in skills if skill["skill_name"]]


def normalize_rows(rows: list[list[Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    headers = [normalize_key(str(header)) for header in rows[0]]
    normalized: list[dict[str, Any]] = []
    for row in rows[1:]:
        record = {}
        for index, header in enumerate(headers):
            if header:
                record[header] = row[index] if index < len(row) else ""
        if any(normalize_text(value) for value in record.values()):
            normalized.append(record)
    return normalized


async def read_upload_rows(file: UploadFile) -> tuple[str, list[list[Any]]]:
    suffix = Path(file.filename or "").suffix.lower()
    content = await file.read()
    if suffix == ".csv":
        decoded = content.decode("utf-8-sig")
        return "csv", list(csv.reader(StringIO(decoded)))
    if suffix == ".xlsx":
        workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
        sheet = workbook[workbook.sheetnames[0]]
        return "xlsx", [list(row) for row in sheet.iter_rows(values_only=True)]
    if suffix == ".xls":
        raise ImportRowProblem("file", "Legacy .xls is not supported yet. Save as .xlsx or .csv.")
    raise ImportRowProblem("file", "Unsupported file type. Upload .xlsx or .csv.")


def validate_record(record: dict[str, Any]) -> None:
    if not normalize_text(record.get("full_name")):
        raise ImportRowProblem("full_name", "Trainer name is required")
    if not normalize_text(record.get("region")):
        raise ImportRowProblem("region", "Region is required")
    if normalize_text(record.get("region")) not in REGIONS:
        raise ImportRowProblem("region", f"Unsupported region. Use one of: {', '.join(sorted(REGIONS))}")
    if not split_multi(record.get("skills")):
        raise ImportRowProblem("skills", "At least one skill is required")


def find_existing_trainer(session: Session, record: dict[str, Any]) -> models.Trainer | None:
    external_id = normalize_text(record.get("external_id"))
    if external_id:
        trainer = session.scalar(select(models.Trainer).where(models.Trainer.external_id == external_id))
        if trainer:
            return trainer

    return session.scalar(
        select(models.Trainer).where(
            models.Trainer.full_name_normalized == normalize_name(record["full_name"]),
            models.Trainer.region == normalize_text(record["region"]),
        )
    )


def upsert_trainer(session: Session, record: dict[str, Any]) -> bool:
    trainer = find_existing_trainer(session, record)
    created = trainer is None
    if trainer is None:
        trainer = models.Trainer(
            external_id=normalize_text(record.get("external_id")) or None,
            full_name=normalize_text(record["full_name"]),
            full_name_normalized=normalize_name(record["full_name"]),
            region=normalize_text(record["region"]),
        )
        session.add(trainer)

    trainer.external_id = normalize_text(record.get("external_id")) or trainer.external_id
    trainer.full_name = normalize_text(record["full_name"])
    trainer.full_name_normalized = normalize_name(record["full_name"])
    trainer.region = normalize_text(record["region"])
    trainer.country = normalize_text(record.get("country")) or None
    trainer.business_unit = normalize_text(record.get("business_unit")) or None
    trainer.role_title = normalize_text(record.get("role_title")) or "Trainer"
    trainer.seniority_level = normalize_text(record.get("seniority_level")) or "Senior"
    trainer.languages = "; ".join(split_multi(record.get("languages")) or ["English"])
    trainer.profile_summary = normalize_text(record.get("profile_summary") or record.get("summary")) or None
    trainer.bandwidth = normalize_text(record.get("bandwidth")) or "Medium"
    trainer.validation_status = normalize_text(record.get("validation_status")) or "Self-declared"
    trainer.manager_note = normalize_text(record.get("manager_note")) or None
    trainer.last_updated_at = parse_datetime(record.get("last_updated_at"))

    trainer.skills.clear()
    for skill in parse_skills(record.get("skills")):
        trainer.skills.append(models.Skill(**skill))

    industries = split_multi(record.get("industries"))
    project_name = normalize_text(record.get("project_name")) or "Imported profile context"
    trainer.projects.clear()
    trainer.projects.append(
        models.Project(
            project_name=project_name,
            client_sector=industries[0] if industries else None,
            role_on_project=normalize_text(record.get("role_on_project")) or None,
            project_status=normalize_text(record.get("project_status")) or "Recent",
            time_commitment=trainer.bandwidth,
            relevance_tags="; ".join([skill["skill_name"] for skill in parse_skills(record.get("skills"))]),
        )
    )

    trainer.comfort.clear()
    if not created:
        session.flush()
    default_comfort = parse_int(record.get("meeting_comfort"), default=3)
    for meeting_type in MEETING_TYPES:
        field_key = f"{meeting_type.lower().replace(' ', '_')}_comfort"
        trainer.comfort.append(
            models.MeetingComfort(
                meeting_type=meeting_type,
                comfort_level=parse_int(record.get(field_key), default=default_comfort),
                confidence_note=normalize_text(record.get("comfort_note")) or "Imported profile needs comfort detail.",
                validated_by_manager=trainer.validation_status != "Self-declared",
            )
        )

    if trainer.preference is None:
        trainer.preference = models.Preference()
    trainer.preference.client_facing_desire = normalize_text(record.get("client_facing_desire")) or "Neutral"
    trainer.preference.travel_preference = normalize_text(record.get("travel_preference")) or "Regional"
    trainer.preference.preferred_sectors = "; ".join(industries)
    trainer.preference.stretch_interest = parse_bool(record.get("stretch_interest"))

    return created


async def import_trainers(session: Session, file: UploadFile) -> models.ImportBatch:
    source_type, rows = await read_upload_rows(file)
    records = normalize_rows(rows)
    batch = models.ImportBatch(filename=file.filename or "upload", source_type=source_type)
    session.add(batch)
    session.flush()

    for offset, record in enumerate(records, start=2):
        try:
            validate_record(record)
            created = upsert_trainer(session, record)
            if created:
                batch.created_count += 1
            else:
                batch.updated_count += 1
        except ImportRowProblem as exc:
            batch.error_count += 1
            batch.errors.append(models.ImportRowError(row_number=offset, field=exc.field, message=exc.message))

    session.commit()
    session.refresh(batch)
    return batch
