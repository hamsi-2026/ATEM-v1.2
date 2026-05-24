# Plan

## Phase 1: Backend Foundation

Create a Python backend with FastAPI, SQLAlchemy, SQLite, and Pydantic schemas.

Deliverables:

- Backend package structure.
- SQLite database configuration.
- SQLAlchemy models.
- Pydantic request/response schemas.
- Health endpoint.
- Local backend run command.

## Phase 2: Import Pipeline

Move Excel and CSV import processing from the browser to Python.

Deliverables:

- File upload endpoint.
- Excel and CSV parser.
- Header normalization.
- Row validation.
- Import batch persistence.
- Row-level error reporting.
- Trainer upsert service.

## Phase 3: Matching Engine

Implement weighted matching as a backend service.

Deliverables:

- Matching request schema.
- Scoring configuration.
- Candidate filtering.
- Weighted score calculation.
- Explanation generation.
- Match result persistence.

## Phase 4: React Integration

Update the frontend to call FastAPI.

Deliverables:

- API client module.
- Replace hardcoded trainer source.
- Upload Excel/CSV to backend.
- Fetch trainer list and profile detail.
- Submit match requests to backend.
- Display import errors and backend status.

## Phase 5: MCP Tool Layer

Expose the same domain services through MCP.

Deliverables:

- MCP server module.
- Tool definitions.
- Tool input/output schemas.
- Shared service calls.
- Local MCP run instructions.

## Phase 6: Verification

Verify the app end-to-end with realistic data.

Deliverables:

- Sample Excel fixture.
- Import tests.
- Matching tests.
- API smoke tests.
- Frontend build/lint.
- Manual browser verification.

## Dependency Order

1. Backend structure.
2. Database models.
3. Import service.
4. Matching service.
5. API endpoints.
6. Frontend integration.
7. MCP server.
8. End-to-end verification.
