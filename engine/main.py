from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] [ENGINE] %(message)s')
logger = logging.getLogger(__name__)

# ── Import all routers ──────────────────────────────────────────────
from routers.auth import router as auth_router
from routers.organizations import router as orgs_router
from routers.facilities import router as facilities_router
from routers.materials import router as materials_router
from routers.matching import router as matching_router
from routers.negotiations import router as negotiations_router
from routers.agreements import router as agreements_router
from routers.shipments import router as shipments_router
from routers.esg import router as esg_router
from routers.dashboard import router as dashboard_router
from routers.map import router as map_router
from routers._legacy import router as legacy_router

# ── DB lifespan: create tables on startup ─────────────────────────
from database import engine as db_engine, Base
import models  # noqa: F401 — triggers all ORM model imports so Base.metadata is populated


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup (idempotent)."""
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialised.")
    yield


# ── Application ────────────────────────────────────────────────────
app = FastAPI(
    title="Symbio-Link ID Engine",
    version="2.0.0",
    description="B2B Industrial Symbiosis Marketplace — AI + MILP + Blockchain",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(orgs_router)
app.include_router(facilities_router)
app.include_router(materials_router)
app.include_router(matching_router)
app.include_router(negotiations_router)
app.include_router(agreements_router)
app.include_router(shipments_router)
app.include_router(esg_router)
app.include_router(dashboard_router)
app.include_router(map_router)

# Legacy endpoints preserved for backward compatibility (WasteForm on root page)
app.include_router(legacy_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "service": "symbio-link-engine"}
