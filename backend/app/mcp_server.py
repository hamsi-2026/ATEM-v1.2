"""MCP tool surface for the Trainer Expert Match Agent.

This module is intentionally thin: tools should call the same service functions
as FastAPI routes so agent behaviour cannot drift from application behaviour.
"""

from backend.app.database import SessionLocal, init_db
from backend.app.schemas import MatchRequestIn
from backend.app.services.analytics import coverage_summary
from backend.app.services.matching import run_match


try:
    from mcp.server.fastmcp import FastMCP
except ImportError:  # pragma: no cover - dependency may be installed later
    FastMCP = None  # type: ignore[assignment]


if FastMCP is not None:
    mcp = FastMCP("trainer-expert-match")

    @mcp.tool()
    def match_trainers(
        topic: str,
        meeting_type: str | None = None,
        industry: str | None = None,
        region: str | None = None,
        language: str | None = "English",
        stretch_mode: bool = False,
        request: str | None = None,
    ) -> dict:
        init_db()
        with SessionLocal() as session:
            response = run_match(
                session,
                MatchRequestIn(
                    request=request,
                    topic=topic,
                    meeting_type=meeting_type,
                    industry=industry,
                    region=region,
                    language=language,
                    stretch_mode=stretch_mode,
                ),
            )
            return response.model_dump()

    @mcp.tool()
    def get_coverage_summary() -> dict:
        init_db()
        with SessionLocal() as session:
            return coverage_summary(session).model_dump()

