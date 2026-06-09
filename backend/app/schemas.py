from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_name: str
    skill_category: Optional[str] = None
    proficiency_level: int
    evidence_type: Optional[str] = None
    evidence_note: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_name: str
    client_sector: Optional[str] = None
    role_on_project: Optional[str] = None
    project_status: str
    time_commitment: str
    relevance_tags: str


class MeetingComfortOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_type: str
    comfort_level: int
    confidence_note: Optional[str] = None
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
    external_id: Optional[str] = None
    full_name: str
    region: str
    country: Optional[str] = None
    role_title: Optional[str] = None
    seniority_level: Optional[str] = None
    languages: str
    bandwidth: str
    validation_status: str
    last_updated_at: datetime


class TrainerDetailOut(TrainerListOut):
    business_unit: Optional[str] = None
    profile_summary: Optional[str] = None
    manager_note: Optional[str] = None
    skills: list[SkillOut] = []
    projects: list[ProjectOut] = []
    comfort: list[MeetingComfortOut] = []
    preference: Optional[PreferenceOut] = None


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


class ImportFromUrlIn(BaseModel):
    url: str = Field(min_length=8)
    source_type: Literal["auto", "file", "sharepoint_list"] = "auto"
    bearer_token: Optional[str] = None


class MatchRequestIn(BaseModel):
    request: Optional[str] = None
    topic: str
    meeting_type: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = "English"
    seniority: Optional[str] = None
    stretch_mode: bool = False
    weights: Optional[dict[str, float]] = None


class MatchResultOut(BaseModel):
    trainer_id: int
    full_name: str
    region: str
    role_title: Optional[str] = None
    score: int
    reasons: list[str]
    caveats: list[str]
    components: dict[str, float]


class MatchResponseOut(BaseModel):
    request_id: int
    results: list[MatchResultOut]


class AgentExecutionStepOut(BaseModel):
    step: str
    detail: str
    tool: Optional[str] = None


class AgentPlanOut(BaseModel):
    goal: str
    steps: list[AgentExecutionStepOut]


class AgentRequestIn(BaseModel):
    query: str = Field(min_length=5)
    use_llm: bool = True
    include_coverage: bool = False


class AgentResponseOut(BaseModel):
    plan: AgentPlanOut
    selected_tools: list[str]
    inferred_request: Optional[MatchRequestIn] = None
    match: Optional[MatchResponseOut] = None
    coverage: Optional[CoverageOut] = None
    used_llm: bool = False
    llm_error: Optional[str] = None


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
