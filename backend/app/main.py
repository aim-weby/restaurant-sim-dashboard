from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.venue import router as venue_router
from app.api.dayparts import router as dayparts_router
from app.api.baseline import router as baseline_router
from app.api.costs import router as costs_router
from app.api.staffing import router as staffing_router
from app.api.simulation import router as simulation_router
from app.api.scenarios import router as scenarios_router
from app.api.sim_params import router as sim_params_router
from app.db.init_db import init_db

app = FastAPI(title="Restaurant Simulation Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(health_router)
app.include_router(venue_router)
app.include_router(dayparts_router)
app.include_router(baseline_router)
app.include_router(costs_router)
app.include_router(staffing_router)
app.include_router(simulation_router)
app.include_router(scenarios_router)
app.include_router(sim_params_router)