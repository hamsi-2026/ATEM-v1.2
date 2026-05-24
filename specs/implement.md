# Implement

## Implementation Sequence

### Step 1: Create Backend Skeleton

Create the backend package and a health endpoint.

Expected outcome:

- `uvicorn backend.app.main:app --reload` starts successfully.
- `GET /health` returns `{ "status": "ok" }`.

### Step 2: Add SQLAlchemy Persistence

Create SQLite engine/session handling and core SQLAlchemy models.

Expected outcome:

- Local database file is created.
- Tables are initialized for MVP development.
- A seed function can insert sample trainer data.

### Step 3: Build Import Service

Move file parsing into Python.

Expected outcome:

- `POST /imports/trainers` accepts `.xlsx` and `.csv`.
- Rows are normalized and validated.
- Valid rows upsert trainer records.
- Invalid rows return useful errors.

### Step 4: Build Matching Service

Port the weighted matching logic from React into Python.

Expected outcome:

- `POST /match` returns ranked results.
- Scores differ when meeting type, region, bandwidth, or stretch mode changes.
- Explanations match score inputs.

### Step 5: Add Analytics

Add coverage summary by topic and region.

Expected outcome:

- `GET /analytics/coverage` returns matrix-ready data.
- Frontend heat map no longer computes coverage locally.

### Step 6: Add MCP Server

Expose backend services as MCP tools.

Expected outcome:

- Agent can call `match_trainers`.
- Agent can call `get_trainer_profile`.
- Tool output matches API output shape.

### Step 7: Update Frontend

Replace hardcoded data access with API calls.

Expected outcome:

- React app loads trainer profiles from FastAPI.
- Import button uploads to backend.
- Match results come from `POST /match`.
- Refreshing the browser does not lose imported data.

### Step 8: Document Deployment Paths

Document production-oriented hosting options.

Expected outcome:

- Deployment documentation explains why SharePoint can host/embed only the frontend.
- Deployment documentation covers Azure-hosted backend requirements.
- Deployment documentation covers Copilot Studio/custom connector access.
- CORS and `VITE_API_BASE_URL` configuration are documented.

### Step 9: Keep AI Scope Explicit

Document that the current MVP is deterministic and not RAG-based.

Expected outcome:

- Requirement upload is described as text extraction plus rule-based field inference.
- RAG, embeddings, vector search, and LLM-generated recommendations are marked as future options only.
- Copilot usage is described as API/action based unless a future RAG phase is approved.

## Initial API Contracts

### `POST /imports/trainers`

Request:

- Multipart form field `file`.

Response:

```json
{
  "batch_id": 1,
  "created_count": 10,
  "updated_count": 4,
  "error_count": 2,
  "errors": [
    {
      "row_number": 7,
      "field": "region",
      "message": "Unsupported region"
    }
  ]
}
```

### `POST /match`

Request:

```json
{
  "topic": "AI governance",
  "meeting_type": "Intro call",
  "industry": "Retail",
  "region": "EMEA",
  "language": "English",
  "stretch_mode": false
}
```

Response:

```json
{
  "results": [
    {
      "trainer_id": 1,
      "full_name": "Anika Meier",
      "score": 88,
      "reasons": [
        "AI governance depth rated 5/5",
        "Intro call comfort rated 5/5",
        "Retail evidence present"
      ],
      "caveats": [],
      "components": {
        "skill": 100,
        "comfort": 100,
        "industry": 100,
        "availability": 62,
        "region": 100,
        "desire": 76
      }
    }
  ]
}
```

## MCP Tool Contracts

### `match_trainers`

Input:

```json
{
  "request": "Need someone for a retail AI introduction meeting in Germany next week",
  "topic": "AI governance",
  "meeting_type": "Intro call",
  "region": "EMEA",
  "industry": "Retail",
  "language": "English",
  "stretch_mode": false
}
```

Output:

- Same result structure as `POST /match`.

### `get_trainer_profile`

Input:

```json
{
  "trainer_id": 1
}
```

Output:

- Trainer profile with skills, projects, comfort, appetite, validation status, and non-sensitive notes.

## Verification Commands

Frontend:

```bash
npm.cmd run lint
npm.cmd run build
```

Backend:

```bash
uvicorn backend.app.main:app --reload
pytest backend/tests
```

## Deployment Notes

See [Deployment Options](../docs/deployment.md).

Current deployment assumption:

- Frontend can be hosted as static files.
- FastAPI backend must run on an application host such as Azure App Service or Azure Container Apps.
- SharePoint can be an entry point for the frontend but cannot run Python backend services.
- Copilot Studio can call ATEM through API actions/custom connectors.

## AI/RAG Notes

The current implementation does not use RAG. It does not include embeddings, semantic retrieval, vector storage, or LLM-generated answer synthesis.

The uploaded requirement document flow extracts readable text, infers structured match fields, and calls deterministic matching.

## Done Definition

The backend migration is complete when:

- Excel import is processed by Python.
- Trainer data is stored in SQLite.
- SQLAlchemy models are the source of persisted data.
- FastAPI serves trainer, import, match, and analytics endpoints.
- MCP tools expose matching and profile lookup.
- React no longer relies on the hardcoded dummy dataset for normal operation.
- End-to-end import, match, profile, and coverage workflows pass verification.
- Deployment options and current non-RAG architecture are documented.
