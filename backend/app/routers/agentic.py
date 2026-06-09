from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_session
from backend.app.schemas import AgentRequestIn, AgentResponseOut
from backend.app.services.agentic import run_agent_query

router = APIRouter(prefix="/agent", tags=["agentic"])


@router.post("/query", response_model=AgentResponseOut)
async def query_agent(payload: AgentRequestIn, session: Session = Depends(get_session)) -> AgentResponseOut:
    return await run_agent_query(
        session,
        query=payload.query,
        use_llm=payload.use_llm,
        include_coverage=payload.include_coverage,
    )
