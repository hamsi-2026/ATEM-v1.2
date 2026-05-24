# Specify

## Scope

Build the next version of the Trainer Expert Match Agent as a React frontend backed by a Python service. The frontend may keep the current Vite implementation, but profile data, import processing, matching, and agent-facing operations move to the backend.

## Target Stack

- Frontend: React, TypeScript, Vite.
- Backend API: Python, FastAPI, Pydantic.
- Database: SQLite for MVP.
- ORM: SQLAlchemy 2.x.
- Import processing: Python parsers for `.xlsx`, `.xls`, and `.csv`.
- Agent/tool layer: MCP server exposing matching and profile tools.
- Local development: frontend and backend run as separate processes.

## AI/RAG Position

The current MVP is not a RAG application. It does not use embeddings, a vector database, semantic retrieval, or LLM-generated answers.

The current requirement upload flow is rule-based:

- Extract readable text from `.docx`, `.pdf`, `.txt`, or `.md`.
- Infer structured fields such as topic, region, industry, language, meeting type, and stretch mode.
- Run deterministic matching against structured trainer profiles.

RAG may be considered in a later phase if the product needs semantic retrieval across unstructured coach CVs, project writeups, feedback notes, case studies, or long-form requirement documents.

## Core Backend Capabilities

### Data Import

The backend shall accept Excel and CSV files through an upload endpoint.

Supported formats:

- `.xlsx`
- `.xls`
- `.csv`

The importer shall:

- Treat the Skills Lab Coach Profiling Form as the source of truth for capability names and categories.
- Treat Excel/CSV uploads as trainer response data only, not as the authority for defining the skill catalog.
- Read the worksheet that best matches a trainer response export.
- Normalize headers into canonical field names.
- Map capability response columns to the canonical skills listed in the Skills Lab Coach Profiling Form.
- Ignore unknown numeric columns unless they are explicitly supported profile fields or additional-skills free text.
- Validate required fields.
- Upsert trainer profiles by stable identifier where available, otherwise by normalized full name plus region.
- Record import batch metadata.
- Return row-level validation errors.

Canonical capability categories from the Skills Lab Coach Profiling Form:

- Software Engineering
- AI/ML
- Business Management
- Cloud
- IT Operations
- DevOps
- Project Management
- Data Analytics/Engineering
- Database Management
- Web Application
- Testing
- Other Programming Languages
- Soft Skills
- Additional Skills

The `Topic` selector shall use this canonical capability catalog. It must not be derived from arbitrary Excel headers. Excel uploads can populate trainer proficiency against these skills, and free-text additional skills may be shown under `Additional Skills`.

### Profile Storage

The backend shall persist trainer profile data in SQLite using SQLAlchemy models.

Primary entities:

- Trainer
- Skill
- Project
- MeetingComfort
- Preference
- ValidationNote
- ImportBatch
- ImportRowError
- MatchRequest
- MatchResult

### Matching Engine

The backend shall expose ranked trainer recommendations for a meeting request.

Inputs:

- Topic or capability from the canonical skills form catalog.
- Meeting type.
- Industry or client sector.
- Region or country.
- Date or urgency.
- Preferred seniority.
- Language requirement.
- Expert-led vs stretch-compatible mode.
- Optional scoring weight overrides.

Outputs:

- Ranked candidate list.
- Fit score.
- Positive reasons.
- Caveats.
- Score component breakdown.
- Evidence snippets.

### FastAPI Endpoints

Initial endpoints:

- `GET /health`
- `POST /imports/trainers`
- `GET /trainers`
- `GET /trainers/{trainer_id}`
- `POST /match`
- `GET /analytics/coverage`
- `GET /config/scoring`
- `PUT /config/scoring`

### MCP Tools

Initial MCP tools:

- `search_trainers`
- `match_trainers`
- `get_trainer_profile`
- `get_coverage_summary`
- `explain_match`

MCP tools must call the same service functions as FastAPI endpoints. Matching logic must not fork between API and agent surfaces.

## Non-Goals For This Phase

- Production identity provider integration.
- Real-time calendar integration.
- External client portal.
- Automatic performance scoring from transcripts.
- Retrieval augmented generation, vector search, embeddings, and LLM-generated recommendations.
- Multi-database support.
- Full approval workflow.

## Acceptance Criteria

- A user can upload an Excel workbook and see imported trainer profiles through the API.
- The React app can fetch trainer data from FastAPI instead of using the hardcoded sample data.
- A user can submit a meeting request and receive ranked, explainable results from the backend.
- The same matching function is reachable through an MCP tool.
- SQLite persists data across browser refreshes and backend restarts.
- Row-level import errors are visible to the caller.
