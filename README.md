# Trainer Expert Match Agent

Internal web application for finding best-fit trainers for client and internal meetings. The current frontend prototype is built with React, TypeScript, and Vite.

## Current State

- React app with trainer matching UI.
- FastAPI backend with SQLite persistence.
- Backend Excel/CSV import for trainer profiles.
- Backend matching, coverage analytics, and scoring configuration.
- Requirement document upload uses text extraction and rule-based field inference.
- The current implementation does not use RAG, embeddings, vector search, or LLM answer generation.
- Browser demo data remains as an offline fallback.

## Backend

The service layer uses:

- Python
- FastAPI
- SQLite
- SQLAlchemy
- MCP tools for agent access

The frontend expects the API at `http://127.0.0.1:8000` by default. Set `VITE_API_BASE_URL` to override it.

## Specs

- [Spec Constitution](specs/constitution.md)
- [Specify](specs/specify.md)
- [Clarify](specs/clarify.md)
- [Plan](specs/plan.md)
- [Tasks](specs/tasks.md)
- [Analyse](specs/analyse.md)
- [Implement](specs/implement.md)
- [Deployment Options](docs/deployment.md)

## Frontend Commands

```bash
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## Backend Commands

```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
pytest backend/tests
```
