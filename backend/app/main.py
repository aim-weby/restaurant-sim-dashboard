"""
FastAPI application entry point — Restaurant Simulation Dashboard.

This module initialises the FastAPI application, configures CORS middleware
for development (Vite dev server on ports 5173/5174), registers all API
router modules, and triggers database initialisation on startup.

Architecture:
    The application follows a modular router pattern. Each domain
    (venue, dayparts, baseline, simulation, etc.) has its own APIRouter
    in ``app/api/``, keeping endpoint logic isolated and testable.

Startup Lifecycle:
    1. Environment variables loaded from ``.env`` (OpenAI key, DB URL, etc.)
    2. ``lifespan`` context manager calls ``init_db()`` to create/migrate tables
    3. CORS middleware applied for frontend dev server origins
    4. All domain routers registered under the ``/api`` prefix (implicit in routers)

Usage:
    Run with: ``uvicorn app.main:app --reload``
"""

from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Domain API routers (each handles a specific resource/feature) ---
from app.api.health import router as health_router
from app.api.venue import router as venue_router
from app.api.dayparts import router as dayparts_router
from app.api.baseline import router as baseline_router
from app.api.costs import router as costs_router
from app.api.staffing import router as staffing_router
from app.api.simulation import router as simulation_router
from app.api.scenarios import router as scenarios_router
from app.api.sim_params import router as sim_params_router
from app.api.experiments import router as experiments_router
from app.api.opening_hours import router as opening_hours_router
from app.api.seed import router as seed_router
from app.api.seed_presentation import router as seed_presentation_router
from app.api.ai import router as ai_router
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.

    Executes database initialisation (table creation, seed data) on startup.
    The ``yield`` separates startup from shutdown; any cleanup logic would
    follow ``yield`` (currently none required).
    """
    init_db()
    yield


# --- FastAPI application instance ---
app = FastAPI(title="Restaurant Simulation Dashboard API", version="0.1.0", lifespan=lifespan)

# --- CORS configuration ---
# In development: allows Vite dev server origins.
# In production (Railway): reads ALLOWED_ORIGINS env var (comma-separated).
# Falls back to "*" if not set, which is safe for the thesis demo context.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if _raw_origins == "*":
    _allow_origins = ["*"]
    _allow_credentials = False  # credentials cannot be used with wildcard
else:
    _allow_origins = [o.strip() for o in _raw_origins.split(",")]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router registration ---
# Each router handles a specific domain of the application. The order is
# logical (settings → data → simulation → AI) but does not affect runtime.
app.include_router(health_router)        # GET /health — liveness probe
app.include_router(venue_router)         # /venue — restaurant settings (name, seats, currency)
app.include_router(dayparts_router)      # /dayparts — CRUD for time-of-day slots
app.include_router(baseline_router)      # /baseline-weeks — weekly demand data & KPI aggregation
app.include_router(costs_router)         # /costs — fixed costs, food cost %
app.include_router(staffing_router)      # /staffing — staff plans per daypart/role
app.include_router(simulation_router)    # /simulation — DES/MC run endpoint
app.include_router(scenarios_router)     # /scenarios — saved what-if scenarios
app.include_router(sim_params_router)    # /sim-params — triangular distribution parameters
app.include_router(experiments_router)   # /experiments — batch experiment runner
app.include_router(opening_hours_router) # /opening-hours — daily open/close times
app.include_router(seed_router)          # /seed — database seeding utilities
app.include_router(seed_presentation_router)  # /seed/presentation — thesis demo dataset
app.include_router(ai_router)           # /ai — GPT-powered advisory chat & analysis