# Trainer Expert Match Agent

Internal web application for finding best-fit trainers for client and internal meetings. The current frontend prototype is built with React, TypeScript, and Vite.

## Current State

- React app with trainer matching UI.
- Excel/CSV import in the browser.
- Dummy sample data in `src/App.tsx`.
- No persistent backend yet.

## Planned Backend

The next implementation phase is specified in `specs/` and will use:

- Python
- FastAPI
- SQLite
- SQLAlchemy
- MCP tools for agent access

## Specs

- [Spec Constitution](specs/constitution.md)
- [Specify](specs/specify.md)
- [Clarify](specs/clarify.md)
- [Plan](specs/plan.md)
- [Tasks](specs/tasks.md)
- [Analyse](specs/analyse.md)
- [Implement](specs/implement.md)

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
