# Spec Constitution

## Product Principle

The Trainer Expert Match Agent is an internal expert-discovery system, not a static skills matrix. Every implementation choice must help users answer: who is the best trainer to involve in this meeting, with this client, in this region, at this time?

## Architecture Principle

The system shall use a service-backed architecture:

- Python is the authoritative backend language for ingestion, matching, analytics, and MCP tools.
- FastAPI is the HTTP API layer for the React application.
- SQLite is the MVP persistence layer.
- SQLAlchemy is the only ORM/data access layer used by the backend.
- Alembic should be introduced before multi-user production deployment.
- MCP is the agent/tool interface for structured matching and profile search.

## Data Principle

Trainer data must be persisted outside the browser. Excel and CSV uploads are source inputs, not the long-term state of the application.

The backend shall preserve:

- Raw import metadata.
- Normalized trainer profiles.
- Skills and proficiency evidence.
- Projects and workload context.
- Meeting comfort by meeting type.
- Client-facing appetite and stretch preference.
- Validation status and freshness metadata.

## Matching Principle

Recommendations must remain explainable. A match score is not acceptable without:

- Top positive factors.
- Caveats and limiting factors.
- Evidence source where available.
- Clear distinction between capability, availability, willingness, and validation.

## Governance Principle

Self-declared data, manager-validated data, and community-validated data must be visibly distinct. Sensitive manager notes should be modeled separately so role-based access can be added without reshaping the whole domain.

## Agent Principle

The agent must orchestrate structured tools instead of inventing answers from conversation alone. Natural-language requests should be parsed into explicit matching inputs before ranking candidates.

## Delivery Principle

Each phase shall include:

- A written specification.
- Clarified open decisions.
- A plan with dependencies.
- Task-level implementation checklist.
- Analysis of risks and trade-offs.
- Implementation notes and verification criteria.
