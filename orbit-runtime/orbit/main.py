"""Orbit Server — FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orbit.api.routes import router as api_router, set_orchestrator as set_api_orch
from orbit.api.ws import ws_router, set_orchestrator as set_ws_orch
from orbit.config import config
from orbit.core.orchestrator import Orchestrator

logging.basicConfig(level=config.log_level, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

orchestrator = Orchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start/stop the orchestrator with the server."""
    set_api_orch(orchestrator)
    set_ws_orch(orchestrator)

    await orchestrator.start()
    loop_task = asyncio.create_task(orchestrator.run_loop())
    logger.info(f"Orbit server running on {config.host}:{config.port}")

    yield

    orchestrator.running = False
    loop_task.cancel()
    try:
        await loop_task
    except asyncio.CancelledError:
        pass
    await orchestrator.stop()


app = FastAPI(
    title="Orbit",
    description="Personal aerial AI companion — simulation server",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("orbit.main:app", host=config.host, port=config.port, reload=True)
