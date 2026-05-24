import re
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from xml.etree import ElementTree

from backend.app import models
from backend.app.schemas import MatchRequestIn, RequirementCompareOut
from backend.app.services.matching import run_match
from backend.app.services.normalization import MEETING_TYPES, REGION_ORDER, normalize_text


INDUSTRIES = (
    "Banking",
    "Retail",
    "Public sector",
    "Manufacturing",
    "Technology",
    "Healthcare",
    "Engineering",
    "Financial services",
)

REGION_TERMS = {
    "EMEA": ("emea", "europe", "germany", "france", "italy", "netherlands", "uae", "south africa"),
    "NA": ("na", "north america", "united states", "usa", "canada"),
    "UK": ("uk", "united kingdom", "london", "england"),
    "HK": ("hk", "hong kong"),
    "MY": ("my", "malaysia", "kuala lumpur"),
    "SG": ("sg", "singapore"),
    "AUS": ("aus", "australia", "sydney", "melbourne", "new zealand"),
}

LANGUAGES = ("English", "German", "Dutch", "Spanish", "Arabic", "French", "Mandarin")


def extract_docx_text(content: bytes) -> str:
    try:
        from docx import Document

        document = Document(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
    except Exception:
        with ZipFile(BytesIO(content)) as archive:
            xml = archive.read("word/document.xml")
        root = ElementTree.fromstring(xml)
        texts = [node.text for node in root.iter() if node.tag.endswith("}t") and node.text]
        return "\n".join(texts)


def extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise HTTPException(
            status_code=400,
            detail="PDF requirement upload needs pypdf installed. Run pip install -r requirements.txt.",
        ) from exc

    reader = PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


async def extract_requirement_text(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    content = await file.read()
    if suffix == ".docx":
        text = extract_docx_text(content)
    elif suffix == ".pdf":
        text = extract_pdf_text(content)
    elif suffix in {".txt", ".md"}:
        text = content.decode("utf-8-sig", errors="replace")
    else:
        raise HTTPException(status_code=400, detail="Upload a .docx, .pdf, or .txt requirement document.")

    text = normalize_text(text)
    if not text:
        raise HTTPException(status_code=400, detail="No readable text found in requirement document.")
    return text


def contains_term(text: str, term: str) -> bool:
    return bool(re.search(rf"(?<!\w){re.escape(term.lower())}(?!\w)", text))


def infer_topic(session: Session, text: str) -> str:
    available_skills = sorted(
        {skill for (skill,) in session.execute(select(models.Skill.skill_name)).all()},
        key=len,
        reverse=True,
    )
    lowered = text.lower()
    for skill in available_skills:
        skill_lower = skill.lower()
        if skill_lower in lowered:
            return skill
        first_word = skill_lower.split()[0]
        if len(first_word) > 3 and contains_term(lowered, first_word):
            return skill
    if available_skills:
        return available_skills[0]
    raise HTTPException(status_code=400, detail="No trainer skills are available. Import trainers before comparing requirements.")


def infer_meeting_type(text: str) -> str | None:
    lowered = text.lower()
    if "workshop" in lowered:
        return "Workshop"
    if "deep dive" in lowered or "technical" in lowered:
        return "Deep dive"
    if "pitch" in lowered or "executive" in lowered or "presentation" in lowered:
        return "Executive pitch"
    if "intro" in lowered or "discovery" in lowered or "initial call" in lowered:
        return "Intro call"
    for meeting_type in MEETING_TYPES:
        if meeting_type.lower() in lowered:
            return meeting_type
    return None


def infer_region(text: str) -> str | None:
    lowered = text.lower()
    for region in REGION_ORDER:
        if any(contains_term(lowered, term) for term in REGION_TERMS[region]):
            return region
    return None


def infer_industry(text: str) -> str | None:
    lowered = text.lower()
    for industry in INDUSTRIES:
        if industry.lower() in lowered:
            return industry
    return None


def infer_language(text: str) -> str | None:
    lowered = text.lower()
    for language in LANGUAGES:
        if language.lower() in lowered:
            return language
    return "English"


def infer_requirement(session: Session, text: str) -> MatchRequestIn:
    return MatchRequestIn(
        request=text,
        topic=infer_topic(session, text),
        meeting_type=infer_meeting_type(text),
        industry=infer_industry(text),
        region=infer_region(text),
        language=infer_language(text),
        stretch_mode=any(term in text.lower() for term in ("stretch", "development", "growth opportunity")),
    )


async def compare_requirement(session: Session, file: UploadFile) -> RequirementCompareOut:
    text = await extract_requirement_text(file)
    inferred = infer_requirement(session, text)
    match = run_match(session, inferred)
    preview = text[:700] + ("..." if len(text) > 700 else "")
    return RequirementCompareOut(
        filename=file.filename or "requirement",
        extracted_text_preview=preview,
        inferred_request=inferred,
        match=match,
    )
