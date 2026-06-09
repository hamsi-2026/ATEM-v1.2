from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import SessionLocal, init_db
from backend.app.routers import agentic, analytics, config, imports, matching, requirements, trainers
from backend.app.services.skill_catalog import normalize_existing_skill_records


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    with SessionLocal() as session:
        normalize_existing_skill_records(session)
    yield


app = FastAPI(title="Trainer Expert Match Agent API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(imports.router)
app.include_router(trainers.router)
app.include_router(matching.router)
app.include_router(agentic.router)
app.include_router(analytics.router)
app.include_router(config.router)
app.include_router(requirements.router)
