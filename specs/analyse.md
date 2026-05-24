# Analyse

## Current State

The current React app contains a complete front-end MVP with:

- Dummy trainer profiles stored in `src/App.tsx`.
- Browser-side CSV and Excel parsing.
- In-memory matching.
- In-memory profile data.
- No persistent storage.
- No backend API.
- No MCP tool layer.
- No RAG pipeline, embeddings, vector database, or LLM answer generation.

This is useful for validating the interaction model, but it is not sufficient for real trainer data because imported data disappears on refresh and the matching logic is not reusable by an agent.

## Target State

The target state moves data and matching authority to Python:

- Excel/CSV files are uploaded to FastAPI.
- Python validates and normalizes file content.
- SQLAlchemy persists normalized data in SQLite.
- Matching runs as a backend domain service.
- React becomes a client of the API.
- MCP tools call the same backend services.
- Requirement document upload extracts text and infers structured match fields using rules.

## RAG Assessment

RAG is not part of the current architecture. The product currently works from structured trainer data, a canonical skills catalog, deterministic scoring, and rule-based field inference.

RAG would become relevant if ATEM needs to search and cite unstructured evidence such as:

- Coach CVs.
- Project narratives.
- Training feedback notes.
- Client requirement documents.
- Case studies or proposal documents.

A future RAG architecture would require document ingestion, chunking, embeddings, vector storage, retrieval, answer generation, and citation handling. That is intentionally outside the MVP because the current matching problem can be handled with structured profile data and explainable scoring.

## Key Risks

### Excel Shape Variability

The existing form export may not match the assumed headers.

Mitigation:

- Use header aliases.
- Return row-level errors.
- Preserve import batch metadata.
- Add a mapping screen later if needed.

### Duplicate Trainers

Excel rows may not include a stable trainer ID.

Mitigation:

- Prefer explicit `trainer_id`.
- Fall back to normalized `full_name + region`.
- Track duplicate warnings in import results.

### Sensitive Notes

Manager notes may contain sensitive information.

Mitigation:

- Store validation notes separately.
- Do not expose notes through general list endpoints by default.
- Add role-scoped access before production.

### Matching Trust

Users may not trust recommendations if score logic is opaque.

Mitigation:

- Show component scores.
- Show reasons and caveats.
- Store scoring weights.
- Keep matching deterministic for MVP.

### MCP Duplication

MCP tools could drift from API behavior if implemented separately.

Mitigation:

- Put matching, search, and coverage logic in service modules.
- FastAPI routes and MCP tools must call the same service functions.

### RAG Scope Creep

Adding RAG too early could make recommendations harder to validate and operate.

Mitigation:

- Keep MVP matching deterministic.
- Use structured skill, region, comfort, industry, availability, appetite, and validation data.
- Add RAG only when stakeholders confirm a need for semantic search across unstructured evidence.

## Recommended Backend Structure

```text
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    mcp_server.py
    services/
      imports.py
      matching.py
      trainers.py
      analytics.py
      scoring.py
    routers/
      imports.py
      trainers.py
      matching.py
      analytics.py
      config.py
  tests/
    test_imports.py
    test_matching.py
```

## Recommended Database Tables

- `trainers`
- `skills`
- `projects`
- `meeting_comfort`
- `preferences`
- `validation_notes`
- `import_batches`
- `import_row_errors`
- `scoring_configs`
- `match_requests`
- `match_results`

## Recommended Libraries

- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `pydantic`
- `python-multipart`
- `openpyxl`
- `mcp`
- `pytest`
- `httpx`

Use `openpyxl` for `.xlsx`. For legacy `.xls`, either require conversion to `.xlsx` or add an explicit dependency such as `xlrd` if stakeholders confirm `.xls` files are still common.
