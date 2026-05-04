"""
Seed / demo data endpoint.

Creates a realistic Czech restaurant dataset in one click.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.venue import VenueSettings
from app.models.daypart import Daypart
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.cost_settings import CostSettings
from app.models.staffing_plan import StaffingPlan
from app.models.simulation_params import SimulationParams
from app.models.opening_hours import OpeningHours

router = APIRouter(prefix="/seed", tags=["seed"])


def _already_seeded(db: Session) -> bool:
    """Check if demo data already exists."""
    venue = db.query(VenueSettings).first()
    return venue is not None and venue.name == "U Zlatého lva"


@router.post("/demo")
def seed_demo(db: Session = Depends(get_db)):
    """Create a realistic Czech restaurant demo dataset."""
    if _already_seeded(db):
        return {"status": "already_seeded", "detail": "Demo data already exists."}

    # --- Venue ---
    venue = db.query(VenueSettings).first()
    if venue:
        venue.name = "U Zlatého lva"
        venue.timezone = "Europe/Prague"
        venue.currency = "CZK"
        venue.seats_total = 40
        venue.tables_count = 10
        venue.mode = "dinein"
    else:
        venue = VenueSettings(
            name="U Zlatého lva",
            seats_total=40,
            tables_count=10,
            mode="dinein",
        )
        db.add(venue)
    db.flush()

    # --- Dayparts ---
    db.query(Daypart).delete()
    dayparts_data = [
        {"label": "Lunch", "start_time": "11:30", "end_time": "14:00", "sort_order": 1},
        {"label": "Afternoon", "start_time": "14:00", "end_time": "17:00", "sort_order": 2},
        {"label": "Dinner", "start_time": "17:00", "end_time": "22:00", "sort_order": 3},
    ]
    daypart_objs = []
    for dp in dayparts_data:
        obj = Daypart(**dp)
        db.add(obj)
        daypart_objs.append(obj)
    db.flush()

    dp_ids = [d.id for d in daypart_objs]  # Lunch, Afternoon, Dinner

    # --- Opening Hours ---
    db.query(OpeningHours).delete()
    for wd in range(7):
        db.add(OpeningHours(
            weekday=wd,
            open_time="11:30",
            close_time="22:00",
            is_closed=(wd == 6),  # Sunday closed
        ))
    db.flush()

    # --- Baseline Week ---
    db.query(BaselineDaypartData).delete()
    db.query(BaselineWeek).delete()
    week = BaselineWeek(week_start="2025-02-03", label="Demo week (Feb 3)")
    db.add(week)
    db.flush()

    # --- Baseline Data (realistic demand) ---
    # [weekday][daypart_idx] -> (arrivals_groups, avg_spend, avg_party_size)
    demand = {
        # Mon
        0: [(12, 420, 2.2), (4, 250, 1.8), (15, 520, 2.5)],
        # Tue
        1: [(10, 400, 2.1), (3, 230, 1.7), (14, 510, 2.4)],
        # Wed
        2: [(13, 430, 2.3), (5, 260, 1.9), (16, 530, 2.5)],
        # Thu
        3: [(14, 440, 2.2), (5, 270, 2.0), (18, 550, 2.6)],
        # Fri
        4: [(16, 460, 2.4), (6, 280, 2.0), (25, 600, 2.8)],
        # Sat
        5: [(18, 480, 2.5), (8, 300, 2.1), (28, 650, 3.0)],
        # Sun (closed)
        6: [(0, 0, 0), (0, 0, 0), (0, 0, 0)],
    }

    for wd, dp_data in demand.items():
        for dp_idx, (arr, spend, party) in enumerate(dp_data):
            db.add(BaselineDaypartData(
                baseline_week_id=week.id,
                weekday=wd,
                daypart_id=dp_ids[dp_idx],
                arrivals_groups=arr,
                avg_spend_per_group=spend,
                avg_party_size=party,
            ))
    db.flush()

    # --- Costs ---
    costs = db.query(CostSettings).first()
    if costs:
        costs.fixed_cost_week = 15000
        costs.food_cost_pct = 0.30
    else:
        db.add(CostSettings(fixed_cost_week=15000, food_cost_pct=0.30))
    db.flush()

    # --- Staffing ---
    db.query(StaffingPlan).delete()
    # Base staffing for weekdays, more on Fri-Sat
    for wd in range(7):
        if wd == 6:
            continue  # Closed Sunday
        for dp_idx, dp_id in enumerate(dp_ids):
            # Kitchen
            kitchen_count = 2 if wd < 4 else 3
            if dp_idx == 1:
                kitchen_count = 1  # Afternoon quiet
            # Service
            service_count = 2 if wd < 4 else 3
            if dp_idx == 1:
                service_count = 1

            hours = [2.5, 3.0, 5.0][dp_idx]  # hours per daypart

            db.add(StaffingPlan(
                weekday=wd, daypart_id=dp_id, role="kitchen",
                staff_count=kitchen_count, hourly_rate=180, hours_in_daypart=hours,
            ))
            db.add(StaffingPlan(
                weekday=wd, daypart_id=dp_id, role="service",
                staff_count=service_count, hourly_rate=160, hours_in_daypart=hours,
            ))
    db.flush()

    # --- Simulation Params ---
    existing_sp = db.query(SimulationParams).filter(
        SimulationParams.baseline_week_id == week.id
    ).first()
    if not existing_sp:
        db.add(SimulationParams(
            baseline_week_id=week.id,
            prep_time_min=5, prep_time_mode=12, prep_time_max=25,
            seat_time_min=30, seat_time_mode=45, seat_time_max=75,
            alpha_seat_wait=0.15,
            balking_wait_table_limit=15,
            balking_wait_food_limit=30,
            price_elasticity=-1.2,
            demand_noise_pct=0.2,
        ))

    db.commit()

    return {
        "status": "seeded",
        "detail": "Demo data created: 'U Zlatého lva', 3 dayparts, 1 baseline week, staffing, costs, params.",
        "baseline_week_id": week.id,
    }
