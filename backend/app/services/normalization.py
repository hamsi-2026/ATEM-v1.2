from datetime import UTC, datetime


REGIONS = {"APAC", "EMEA", "Americas", "Benelux"}
MEETING_TYPES = ("Intro call", "Executive pitch", "Workshop", "Deep dive")

HEADER_ALIASES = {
    "trainer_id": "external_id",
    "id": "external_id",
    "trainer_name": "full_name",
    "name": "full_name",
    "skill_set": "skills",
    "skillset": "skills",
    "skill": "skills",
    "business_region": "region",
    "availability": "bandwidth",
    "current_availability": "bandwidth",
    "client_appetite": "client_facing_desire",
    "desire": "client_facing_desire",
    "appetite": "client_facing_desire",
    "role": "role_title",
    "seniority": "seniority_level",
    "industry": "industries",
    "sector": "industries",
    "current_project": "project_name",
    "project": "project_name",
    "manager_notes": "manager_note",
    "last_updated": "last_updated_at",
}


def normalize_text(value: object) -> str:
    return str(value or "").strip()


def normalize_key(value: str) -> str:
    key = normalize_text(value).lower()
    for char in (" ", "-", "/", "\\", "."):
        key = key.replace(char, "_")
    while "__" in key:
        key = key.replace("__", "_")
    key = key.strip("_")
    return HEADER_ALIASES.get(key, key)


def split_multi(value: object) -> list[str]:
    text = normalize_text(value)
    if not text:
        return []
    for separator in ("|", "\n", ","):
        text = text.replace(separator, ";")
    return [item.strip() for item in text.split(";") if item.strip()]


def normalize_name(value: str) -> str:
    return " ".join(normalize_text(value).lower().split())


def parse_bool(value: object) -> bool:
    return normalize_text(value).lower() in {"1", "true", "yes", "y", "open", "interested"}


def parse_int(value: object, default: int = 3, minimum: int = 1, maximum: int = 5) -> int:
    try:
        parsed = int(float(normalize_text(value)))
    except ValueError:
        parsed = default
    return max(minimum, min(maximum, parsed))


def parse_datetime(value: object) -> datetime:
    text = normalize_text(value)
    if not text:
        return datetime.now(UTC)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=UTC)
        except ValueError:
            pass
    return datetime.now(UTC)
