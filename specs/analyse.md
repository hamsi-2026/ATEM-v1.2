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

This is useful for validating the interaction model, but it is not sufficient for real trainer data because imported data disappears on refresh and the matching logic is not reusable by an agent.

## Target State

The target state moves data and matching authority to Python:

- Excel/CSV files are uploaded to FastAPI.
- Python validates and normalizes file content.
- SQLAlchemy persists normalized data in SQLite.
- Matching runs as a backend domain service.
- React becomes a client of the API.
- MCP tools call the same backend services.

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
