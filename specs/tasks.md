# Tasks

## Backend Setup

- [x] Create `backend/` package.
- [x] Add `pyproject.toml` or backend dependency section.
- [x] Add dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `python-multipart`, `openpyxl`, `pandas` or lightweight CSV/XLSX parser choice, `mcp`.
- [x] Add `backend/app/main.py`.
- [x] Add `backend/app/database.py`.
- [x] Add `backend/app/models.py`.
- [x] Add `backend/app/schemas.py`.
- [x] Add `backend/app/services/`.

## Database

- [x] Define `Trainer` model.
- [x] Define `Skill` model.
- [x] Define `Project` model.
- [x] Define `MeetingComfort` model.
- [x] Define `Preference` model.
- [ ] Define `ValidationNote` model.
- [x] Define `ImportBatch` model.
- [x] Define `ImportRowError` model.
- [x] Define `ScoringConfig` model.
- [x] Add database initialization for local MVP.

## Import Processing

- [x] Implement Excel reader for `.xlsx`.
- [x] Implement Excel reader for `.xls` or define conversion limitation.
- [x] Implement CSV reader.
- [x] Implement header normalization.
- [x] Implement field alias map.
- [x] Define canonical skills catalog from the Skills Lab Coach Profiling Form.
- [x] Map recognized form skill columns to canonical skill names and categories.
- [x] Ensure Topic/capability dropdown is populated from the full form catalog, not only imported trainer data.
- [x] Reject or ignore unrecognized numeric Excel columns unless mapped to the form catalog or `Additional Skills`.
- [x] Implement row validation.
- [x] Implement trainer upsert.
- [x] Persist import batch results.
- [x] Return row-level errors.

## Matching

- [x] Port existing frontend scoring logic to Python.
- [x] Add language hard filter.
- [ ] Add optional region hard filter.
- [x] Add skill relevance scoring.
- [x] Add meeting comfort scoring.
- [x] Add industry relevance scoring.
- [x] Add availability scoring.
- [x] Add desire/stretch scoring.
- [x] Add validation and stale-profile adjustments.
- [x] Generate positive reasons and caveats.
- [x] Persist match request and result summary.

## FastAPI

- [x] Add `GET /health`.
- [x] Add `POST /imports/trainers`.
- [x] Add `GET /trainers`.
- [x] Add `GET /trainers/{trainer_id}`.
- [x] Add `POST /match`.
- [x] Add `GET /analytics/coverage`.
- [x] Add scoring config endpoints.
- [x] Add CORS for Vite dev server.

## MCP

- [x] Add `backend/app/mcp_server.py`.
- [ ] Expose `search_trainers`.
- [x] Expose `match_trainers`.
- [ ] Expose `get_trainer_profile`.
- [x] Expose `get_coverage_summary`.
- [ ] Expose `explain_match`.
- [x] Ensure MCP tools use shared services, not duplicate logic.

## AI/RAG

- [x] Document that current matching is deterministic and not RAG-based.
- [x] Document that requirement upload uses text extraction plus rule-based field inference.
- [ ] Future: evaluate RAG only if unstructured evidence search with citations becomes a requirement.
- [ ] Future: select embedding model, vector store, chunking strategy, and citation policy if RAG is approved.

## Frontend

- [x] Add API client.
- [x] Replace in-memory dummy dataset with API responses.
- [x] Keep demo data only as an optional seed.
- [x] Send Excel/CSV files to FastAPI upload endpoint.
- [x] Display import batch result.
- [x] Display import row errors.
- [x] Submit match request to backend.
- [x] Fetch profile detail from backend.
- [x] Display backend health/offline state.

## Verification

- [x] Add backend unit tests for import normalization.
- [x] Add backend unit tests for matching.
- [x] Add API smoke test.
- [x] Run frontend lint.
- [x] Run frontend build.
- [x] Verify Excel import with sample workbook.
- [ ] Verify data persists after browser refresh.
- [ ] Verify data persists after backend restart.
