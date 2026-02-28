from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.ask import router as ask_router
from app.api.health import router as health_router
from app.api.optimize import router as optimize_router
from app.api.projection import router as projection_router
from app.core.rag_store import initialize_rag_store


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_rag_store()
    yield


app = FastAPI(title="Caporal Compute", version="0.2.0", lifespan=lifespan)

app.include_router(health_router)
app.include_router(optimize_router, prefix="/v1", tags=["optimize"])
app.include_router(ask_router, prefix="/v1", tags=["assistant"])
app.include_router(projection_router, prefix="/v1", tags=["projection"])
