from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_name: str
    skill_category: str | None = None
    proficiency_level: int
    evidence_type: str | None = None
    evidence_note: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_name: str
    client_sector: str | None = None
    role_on_project: str | None = None
    project_status: str
    time_commitment: str
    relevance_tags: str


class MeetingComfortOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_type: str
    comfort_level: int
    confidence_note: str | None = None
    validated_by_manager: bool


class PreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_facing_desire: str
    travel_preference: str
    preferred_sectors: str
    stretch_interest: bool


class TrainerListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None = None
    full_name: str
    region: str
    country: str | None = None
    role_title: str | None = None
    seniority_level: str | None = None
    languages: str
    bandwidth: str
    validation_status: str
    last_updated_at: datetime


class TrainerDetailOut(TrainerListOut):
    business_unit: str | None = None
    profile_summary: str | None = None
    manager_note: str | None = None
    skills: list[SkillOut] = []
    projects: list[ProjectOut] = []
    comfort: list[MeetingComfortOut] = []
    preference: PreferenceOut | None = None


class ImportErrorOut(BaseModel):
    row_number: int
    field: str
    message: str


class ImportResultOut(BaseModel):
    batch_id: int
    created_count: int
    updated_count: int
    error_count: int
    errors: list[ImportErrorOut]


class MatchRequestIn(BaseModel):
    request: str | None = None
    topic: str
    meeting_type: str | None = None
    industry: str | None = None
    region: str | None = None
    language: str | None = "English"
    seniority: str | None = None
    stretch_mode: bool = False
    weights: dict[str, float] | None = None


class MatchResultOut(BaseModel):
    trainer_id: int
    full_name: str
    region: str
    role_title: str | None = None
    score: int
    reasons: list[str]
    caveats: list[str]
    components: dict[str, float]


class MatchResponseOut(BaseModel):
    request_id: int
    results: list[MatchResultOut]


class RequirementCompareOut(BaseModel):
    filename: str
    extracted_text_preview: str
    inferred_request: MatchRequestIn
    match: MatchResponseOut


class SkillCatalogCategoryOut(BaseModel):
    category: str
    skills: list[str]


class CoverageCellOut(BaseModel):
    region: str
    best: int
    count: int
    trainer_names: list[str] = Field(default_factory=list)


class CoverageRowOut(BaseModel):
    topic: str
    cells: list[CoverageCellOut]


class CoverageOut(BaseModel):
    rows: list[CoverageRowOut]


class ScoringConfigIn(BaseModel):
    skill: float = Field(35, ge=0, le=100)
    comfort: float = Field(20, ge=0, le=100)
    industry: float = Field(15, ge=0, le=100)
    availability: float = Field(10, ge=0, le=100)
    region: float = Field(10, ge=0, le=100)
    desire: float = Field(10, ge=0, le=100)


class ScoringConfigOut(ScoringConfigIn):
    id: int
    name: str
