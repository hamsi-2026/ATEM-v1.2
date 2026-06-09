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

## Agentic v1.2 (Minimal)

ATEM now includes a minimal agent orchestration endpoint that keeps deterministic
matching as the source of truth and adds:

- Query planning steps.
- Tool selection (`match_trainers`, optional `get_coverage_summary`).
- Optional LLM-based field extraction with deterministic fallback.

API endpoint:

```bash
POST /agent/query
```

Optional environment variables for LLM extraction:

```bash
ATEM_LLM_API_KEY=
ATEM_LLM_BASE_URL=http://127.0.0.1:11434
ATEM_LLM_MODEL=llama3.2:3b
```

If no LLM key is set, the endpoint still works using deterministic inference only.

### Local Ollama setup

To use local Ollama instead of a hosted API:

1. Ensure Ollama server is running on `http://127.0.0.1:11434`.
2. Pull at least one local model, for example:

```bash
ollama pull llama3.2:3b
```

3. Set:

```bash
ATEM_LLM_BASE_URL=http://127.0.0.1:11434
ATEM_LLM_MODEL=llama3.2:3b
```

No API key is required for local Ollama.

## Version 2: SharePoint-Native SPFx

The SharePoint-native version is in [`v2-spfx`](v2-spfx/README.md). It replaces FastAPI and SQLite with a SharePoint Framework React web part backed by SharePoint Lists and a SharePoint document library.

Use this version when ATEM must be accessed from SharePoint without Azure hosting.

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

## Desktop App (Electron)

Run as a desktop app:

```bash
npm.cmd run desktop:dev
```

- Starts Vite dev server.
- Starts Electron shell.
- Electron main process starts backend API (`uvicorn backend.app.main:app`) automatically.

Run desktop app against an already built frontend:

```bash
npm.cmd run build
npm.cmd run desktop:start
```

## Microsoft Sign-In for SharePoint URL Import

The URL import UI supports Microsoft sign-in so users can keep using standard SharePoint sharing links.

1. Register a Microsoft Entra app for the frontend (SPA).
2. Add a redirect URI for local dev, for example `http://127.0.0.1:5173`.
3. Grant delegated SharePoint permission (for example `AllSites.Read`) and admin-consent it.
4. Create a `.env` file in the project root with:

```bash
VITE_AZURE_CLIENT_ID=<your-spa-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id-or-common>
```

After that, use **Sign in Microsoft** in the URL import section. The app acquires a SharePoint token and sends it to the backend import API.

## Backend Commands

```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
pytest backend/tests
```
