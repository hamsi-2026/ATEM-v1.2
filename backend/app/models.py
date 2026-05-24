from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Trainer(Base):
    __tablename__ = "trainers"
    __table_args__ = (UniqueConstraint("full_name_normalized", "region", name="uq_trainer_name_region"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), index=True)
    full_name_normalized: Mapped[str] = mapped_column(String(255), index=True)
    region: Mapped[str] = mapped_column(String(64), index=True)
    country: Mapped[str] = mapped_column(String(128), nullable=True)
    business_unit: Mapped[str] = mapped_column(String(128), nullable=True)
    role_title: Mapped[str] = mapped_column(String(255), nullable=True)
    seniority_level: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    languages: Mapped[str] = mapped_column(Text, default="")
    profile_summary: Mapped[str] = mapped_column(Text, nullable=True)
    bandwidth: Mapped[str] = mapped_column(String(32), default="Medium", index=True)
    validation_status: Mapped[str] = mapped_column(String(64), default="Self-declared", index=True)
    manager_note: Mapped[str] = mapped_column(Text, nullable=True)
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    skills: Mapped[list["Skill"]] = relationship(back_populates="trainer", cascade="all, delete-orphan")
    projects: Mapped[list["Project"]] = relationship(back_populates="trainer", cascade="all, delete-orphan")
    comfort: Mapped[list["MeetingComfort"]] = relationship(back_populates="trainer", cascade="all, delete-orphan")
    preference: Mapped["Preference"] = relationship(
        back_populates="trainer",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id", ondelete="CASCADE"), index=True)
    skill_name: Mapped[str] = mapped_column(String(255), index=True)
    skill_category: Mapped[str] = mapped_column(String(128), nullable=True)
    proficiency_level: Mapped[int] = mapped_column(Integer, default=3)
    evidence_type: Mapped[str] = mapped_column(String(128), nullable=True)
    evidence_note: Mapped[str] = mapped_column(Text, nullable=True)

    trainer: Mapped[Trainer] = relationship(back_populates="skills")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id", ondelete="CASCADE"), index=True)
    project_name: Mapped[str] = mapped_column(String(255))
    client_sector: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    role_on_project: Mapped[str] = mapped_column(String(255), nullable=True)
    project_status: Mapped[str] = mapped_column(String(64), default="Recent")
    time_commitment: Mapped[str] = mapped_column(String(32), default="Medium")
    relevance_tags: Mapped[str] = mapped_column(Text, default="")

    trainer: Mapped[Trainer] = relationship(back_populates="projects")


class MeetingComfort(Base):
    __tablename__ = "meeting_comfort"
    __table_args__ = (UniqueConstraint("trainer_id", "meeting_type", name="uq_comfort_trainer_meeting"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id", ondelete="CASCADE"), index=True)
    meeting_type: Mapped[str] = mapped_column(String(128), index=True)
    comfort_level: Mapped[int] = mapped_column(Integer, default=3)
    confidence_note: Mapped[str] = mapped_column(Text, nullable=True)
    validated_by_manager: Mapped[bool] = mapped_column(Boolean, default=False)

    trainer: Mapped[Trainer] = relationship(back_populates="comfort")


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id", ondelete="CASCADE"), unique=True, index=True)
    client_facing_desire: Mapped[str] = mapped_column(String(64), default="Neutral", index=True)
    travel_preference: Mapped[str] = mapped_column(String(64), default="Regional")
    preferred_sectors: Mapped[str] = mapped_column(Text, default="")
    stretch_interest: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    trainer: Mapped[Trainer] = relationship(back_populates="preference")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(32))
    created_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    errors: Mapped[list["ImportRowError"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class ImportRowError(Base):
    __tablename__ = "import_row_errors"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    row_number: Mapped[int] = mapped_column(Integer)
    field: Mapped[str] = mapped_column(String(128))
    message: Mapped[str] = mapped_column(Text)

    batch: Mapped[ImportBatch] = relationship(back_populates="errors")


class ScoringConfig(Base):
    __tablename__ = "scoring_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, default="default")
    skill: Mapped[float] = mapped_column(Float, default=35)
    comfort: Mapped[float] = mapped_column(Float, default=20)
    industry: Mapped[float] = mapped_column(Float, default=15)
    availability: Mapped[float] = mapped_column(Float, default=10)
    region: Mapped[float] = mapped_column(Float, default=10)
    desire: Mapped[float] = mapped_column(Float, default=10)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class MatchRequest(Base):
    __tablename__ = "match_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    raw_request: Mapped[str] = mapped_column(Text, nullable=True)
    topic: Mapped[str] = mapped_column(String(255), index=True)
    meeting_type: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    industry: Mapped[str] = mapped_column(String(128), index=True, nullable=True)
    region: Mapped[str] = mapped_column(String(64), index=True, nullable=True)
    language: Mapped[str] = mapped_column(String(64), index=True, nullable=True)
    stretch_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    results: Mapped[list["MatchResult"]] = relationship(back_populates="request", cascade="all, delete-orphan")


class MatchResult(Base):
    __tablename__ = "match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("match_requests.id", ondelete="CASCADE"), index=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id", ondelete="CASCADE"), index=True)
    rank: Mapped[int] = mapped_column(Integer)
    score: Mapped[int] = mapped_column(Integer)
    reasons: Mapped[str] = mapped_column(Text, default="")
    caveats: Mapped[str] = mapped_column(Text, default="")
    components_json: Mapped[str] = mapped_column(Text, default="{}")

    request: Mapped[MatchRequest] = relationship(back_populates="results")
    trainer: Mapped[Trainer] = relationship()
