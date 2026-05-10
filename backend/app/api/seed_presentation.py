"""
Presentation seed endpoint — Bachelor thesis demo dataset.

Creates a robust, representative dataset with 3 baseline weeks, 30 scenarios
(10 per week), realistic restaurant settings, staffing, and financial data.
Designed to showcase the full workflow, simulations, and edge cases of the
Restaurant Simulation Dashboard.

Usage:
    POST /seed/presentation   — teardown + full reseed
"""

import json
from datetime import datetime

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
from app.models.simulation_scenario import SimulationScenario

router = APIRouter(prefix="/seed", tags=["seed"])


# ═══════════════════════════════════════════════════════════════════════════
# HELPER: Create a scenario and persist it
# ═══════════════════════════════════════════════════════════════════════════
def _add_scenario(db: Session, week_id: int, name: str, params: dict) -> SimulationScenario:
    """Create a SimulationScenario with the given params dict."""
    s = SimulationScenario(
        baseline_week_id=week_id,
        name=name,
        created_at=datetime.utcnow().isoformat(),
    )
    s.set_params(params)
    db.add(s)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# MAIN ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/presentation")
def seed_presentation(db: Session = Depends(get_db)):
    """
    Teardown existing data and seed a complete presentation dataset.

    Steps:
        1. Delete all existing data (respecting FK order)
        2. Seed venue, dayparts, opening hours, costs
        3. Create 3 baseline weeks with demand data & simulation params
        4. Create 30 scenarios (10 per week)
    """

    # ─── Step 1: Teardown ─────────────────────────────────────────────
    # Delete in FK-safe order: children first, parents last.
    # SimulationScenario → FK to baseline_weeks
    # BaselineDaypartData → FK to baseline_weeks + dayparts
    # SimulationParams → FK to baseline_weeks
    # StaffingPlan → FK to dayparts
    # Then: baseline_weeks, dayparts, opening_hours, cost_settings, venue
    db.query(SimulationScenario).delete()
    db.query(BaselineDaypartData).delete()
    db.query(SimulationParams).delete()
    db.query(StaffingPlan).delete()
    db.query(BaselineWeek).delete()
    db.query(Daypart).delete()
    db.query(OpeningHours).delete()
    db.query(CostSettings).delete()
    db.query(VenueSettings).delete()
    db.flush()

    # ─── Step 2: Base Restaurant Setup ────────────────────────────────

    # --- 2a. Venue Settings ---
    # A realistic mid-size Czech restaurant in Prague
    venue = VenueSettings(
        name="U Zlatého lva",
        seats_total=40,
        tables_count=10,
        mode="dinein",
    )
    db.add(venue)
    db.flush()

    # --- 2b. Dayparts ---
    # Three classic dayparts for a Czech restaurant
    dayparts_data = [
        {"label": "Lunch",     "start_time": "11:30", "end_time": "14:00", "sort_order": 1},
        {"label": "Afternoon", "start_time": "14:00", "end_time": "17:00", "sort_order": 2},
        {"label": "Dinner",    "start_time": "17:00", "end_time": "22:00", "sort_order": 3},
    ]
    daypart_objs = []
    for dp in dayparts_data:
        obj = Daypart(**dp)
        db.add(obj)
        daypart_objs.append(obj)
    db.flush()
    dp_ids = [d.id for d in daypart_objs]  # [Lunch, Afternoon, Dinner]

    # --- 2c. Opening Hours ---
    # Mon–Sat open, Sunday closed (common for Czech restaurants)
    for wd in range(7):
        db.add(OpeningHours(
            weekday=wd,
            open_time="11:30",
            close_time="22:00",
            is_closed=(wd == 6),  # Sunday closed
        ))
    db.flush()

    # --- 2d. Cost Settings ---
    # Realistic Czech restaurant financials:
    #   - Fixed weekly costs: rent (~35k/mo ≈ 8750/wk), utilities (~8k/mo ≈ 2k/wk),
    #     insurance, POS system, etc. → ~15 000 CZK/week
    #   - Food cost 30% — standard for table-service restaurants
    db.add(CostSettings(fixed_cost_week=15000, food_cost_pct=0.30))
    db.flush()

    # --- 2e. Staffing Plan ---
    # Realistic hourly wages for Czech gastro (2025):
    #   - Kitchen staff: 180 CZK/hr (cook), entry-level ~155 CZK/hr
    #   - Service staff: 160 CZK/hr (waiter), entry-level ~140 CZK/hr
    # Staffing levels scale with expected demand (weekday vs. weekend)
    daypart_hours = [2.5, 3.0, 5.0]  # Lunch 2.5h, Afternoon 3h, Dinner 5h

    for wd in range(7):
        if wd == 6:
            continue  # Sunday: closed

        for dp_idx, dp_id in enumerate(dp_ids):
            # Kitchen: 2 cooks on weekdays, 3 on Fri/Sat; 1 in quiet Afternoon
            if dp_idx == 1:  # Afternoon — low traffic
                kitchen_count = 1
            elif wd >= 4:    # Fri (4), Sat (5)
                kitchen_count = 3
            else:            # Mon–Thu
                kitchen_count = 2

            # Service: same pattern as kitchen
            if dp_idx == 1:
                service_count = 1
            elif wd >= 4:
                service_count = 3
            else:
                service_count = 2

            hours = daypart_hours[dp_idx]

            db.add(StaffingPlan(
                weekday=wd, daypart_id=dp_id, role="kitchen",
                staff_count=kitchen_count, hourly_rate=180, hours_in_daypart=hours,
            ))
            db.add(StaffingPlan(
                weekday=wd, daypart_id=dp_id, role="service",
                staff_count=service_count, hourly_rate=160, hours_in_daypart=hours,
            ))
    db.flush()

    # ─── Step 3: Seed 3 Baseline Weeks ────────────────────────────────

    # ── Week 1: "Demo week" — based on the original demo seed ─────────
    # Early February 2025 — typical winter weekday patterns
    week1 = BaselineWeek(week_start="2025-02-03", label="Únor – základ (3. 2.)")
    db.add(week1)
    db.flush()

    # Demand matrix: [weekday][daypart_idx] → (arrivals_groups, avg_spend_czk, avg_party_size)
    # Mirrors the original demo seed exactly (the user's preferred style)
    demand_w1 = {
        0: [(12, 420, 2.2), (4, 250, 1.8), (15, 520, 2.5)],   # Mon
        1: [(10, 400, 2.1), (3, 230, 1.7), (14, 510, 2.4)],   # Tue
        2: [(13, 430, 2.3), (5, 260, 1.9), (16, 530, 2.5)],   # Wed
        3: [(14, 440, 2.2), (5, 270, 2.0), (18, 550, 2.6)],   # Thu
        4: [(16, 460, 2.4), (6, 280, 2.0), (25, 600, 2.8)],   # Fri
        5: [(18, 480, 2.5), (8, 300, 2.1), (28, 650, 3.0)],   # Sat
        6: [(0, 0, 0), (0, 0, 0), (0, 0, 0)],                 # Sun (closed)
    }

    for wd, dp_data in demand_w1.items():
        for dp_idx, (arr, spend, party) in enumerate(dp_data):
            db.add(BaselineDaypartData(
                baseline_week_id=week1.id, weekday=wd,
                daypart_id=dp_ids[dp_idx],
                arrivals_groups=arr,
                avg_spend_per_group=spend,
                avg_party_size=party,
            ))
    db.flush()

    db.add(SimulationParams(
        baseline_week_id=week1.id,
        prep_time_min=5, prep_time_mode=12, prep_time_max=25,
        seat_time_min=30, seat_time_mode=45, seat_time_max=75,
        alpha_seat_wait=0.15,
        balking_wait_table_limit=20,
        balking_wait_food_limit=45,
        price_elasticity=-1.2,
        demand_noise_pct=0.2,
    ))
    db.flush()

    # ── Week 2: Spring uptick — mid-April warmer weather, terrace open ──
    # Higher demand overall, larger parties (outdoor seating effect)
    week2 = BaselineWeek(week_start="2025-04-14", label="Duben – jarní sezóna (14. 4.)")
    db.add(week2)
    db.flush()

    demand_w2 = {
        # Spring brings +15-25% more guests, slightly higher spends (seasonal menu)
        0: [(14, 450, 2.3), (5, 270, 1.9), (18, 560, 2.6)],   # Mon
        1: [(12, 430, 2.2), (4, 250, 1.8), (17, 540, 2.5)],   # Tue
        2: [(15, 460, 2.4), (6, 280, 2.0), (19, 570, 2.7)],   # Wed
        3: [(16, 470, 2.3), (6, 290, 2.1), (21, 580, 2.7)],   # Thu
        4: [(20, 500, 2.6), (8, 310, 2.2), (30, 650, 3.0)],   # Fri — strong
        5: [(22, 520, 2.7), (10, 330, 2.3), (34, 700, 3.2)],  # Sat — terrace fully booked
        6: [(0, 0, 0), (0, 0, 0), (0, 0, 0)],                 # Sun (closed)
    }

    for wd, dp_data in demand_w2.items():
        for dp_idx, (arr, spend, party) in enumerate(dp_data):
            db.add(BaselineDaypartData(
                baseline_week_id=week2.id, weekday=wd,
                daypart_id=dp_ids[dp_idx],
                arrivals_groups=arr,
                avg_spend_per_group=spend,
                avg_party_size=party,
            ))
    db.flush()

    # Slightly faster kitchen in spring (seasonal prep, lighter dishes)
    db.add(SimulationParams(
        baseline_week_id=week2.id,
        prep_time_min=4, prep_time_mode=10, prep_time_max=20,
        seat_time_min=25, seat_time_mode=40, seat_time_max=70,
        alpha_seat_wait=0.12,
        balking_wait_table_limit=20,
        balking_wait_food_limit=45,
        price_elasticity=-1.1,
        demand_noise_pct=0.18,
    ))
    db.flush()

    # ── Week 3: December holiday rush — pre-Christmas peak season ─────
    # Highest demand, corporate dinners, larger groups, high spend
    week3 = BaselineWeek(week_start="2025-12-08", label="Prosinec – vánoční špička (8. 12.)")
    db.add(week3)
    db.flush()

    demand_w3 = {
        # Christmas season: +30-50% demand, big corporate groups, premium menu prices
        0: [(16, 550, 2.5), (6, 320, 2.0), (22, 680, 3.0)],   # Mon
        1: [(15, 530, 2.4), (5, 300, 1.9), (20, 650, 2.8)],   # Tue
        2: [(18, 570, 2.6), (7, 340, 2.1), (24, 700, 3.1)],   # Wed
        3: [(20, 590, 2.7), (8, 360, 2.2), (26, 720, 3.2)],   # Thu — corporate events
        4: [(24, 620, 2.9), (10, 400, 2.4), (35, 800, 3.5)],  # Fri — holiday parties
        5: [(26, 650, 3.0), (12, 420, 2.5), (38, 850, 3.8)],  # Sat — peak of the year
        6: [(0, 0, 0), (0, 0, 0), (0, 0, 0)],                 # Sun (closed)
    }

    for wd, dp_data in demand_w3.items():
        for dp_idx, (arr, spend, party) in enumerate(dp_data):
            db.add(BaselineDaypartData(
                baseline_week_id=week3.id, weekday=wd,
                daypart_id=dp_ids[dp_idx],
                arrivals_groups=arr,
                avg_spend_per_group=spend,
                avg_party_size=party,
            ))
    db.flush()

    # Holiday season: slower kitchen (complex dishes), guests linger longer
    db.add(SimulationParams(
        baseline_week_id=week3.id,
        prep_time_min=8, prep_time_mode=15, prep_time_max=30,
        seat_time_min=35, seat_time_mode=55, seat_time_max=90,
        alpha_seat_wait=0.20,
        balking_wait_table_limit=20,
        balking_wait_food_limit=45,
        price_elasticity=-0.8,       # Less price-sensitive during holidays
        demand_noise_pct=0.25,       # More volatility (event-driven bookings)
    ))
    db.flush()

    # ─── Step 4: Create 30 Scenarios (10 per week) ────────────────────

    # ═══════════════════════════════════════════════════════════════════
    # WEEK 1 SCENARIOS (Únor – základ)
    # The "baseline" week — demonstrates standard operations + basic edges
    # ═══════════════════════════════════════════════════════════════════

    # Scenario 1.1: Happy path — no changes at all (pure baseline reference)
    _add_scenario(db, week1.id, "Baseline – beze změn", {})

    # Scenario 1.2: Mild price increase (+5%) — tests price elasticity effect
    # At elasticity -1.2, a 5% price hike should reduce demand ~6% but increase revenue per head
    _add_scenario(db, week1.id, "Zdražení menu +5 %", {
        "price_change": {"type": "percent", "value": 0.05},
    })

    # Scenario 1.3: Add 1 waiter on Friday dinner — tests targeted staffing increase
    # Friday dinner is the busiest slot; extra staff should improve throughput
    _add_scenario(db, week1.id, "Páteční posila – 1 číšník navíc", {
        "staffing_changes": [
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 1},
        ],
    })

    # Scenario 1.4: Understaffed kitchen on Wednesday — tests degraded service
    # Removing a cook during a busy lunch increases wait times → balking → lost revenue
    # Demand drops ~8% as groups walk out due to long waits
    _add_scenario(db, week1.id, "Středa – chybí kuchař na oběd", {
        "arrivals_multiplier": 0.92,  # ~8% demand lost to balking / reneging
        "staffing_changes": [
            {"weekday": 2, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": -1},
        ],
    })

    # Scenario 1.5: Weekend capacity expansion — adding 2 tables (8 seats)
    # More seating captures previously lost demand (+10% arrivals served on Fri/Sat)
    _add_scenario(db, week1.id, "Víkend – přidány 2 stoly (+8 míst)", {
        "capacity_changes": {"tables_count": 2, "seats_total": 8},
        "arrivals_multiplier": 1.08,  # Extra capacity absorbs ~8% previously turned-away groups
    })

    # Scenario 1.6: Demand surge +20% arrivals — marketing campaign/event effect
    # Tests system behavior under unexpected demand spike
    _add_scenario(db, week1.id, "Marketingová akce – +20 % návštěvnost", {
        "arrivals_multiplier": 1.20,
    })

    # Scenario 1.7: Rising food costs — supplier price increase to 35%
    # Tests profit margin sensitivity to COGS changes
    _add_scenario(db, week1.id, "Zdražení surovin – food cost 35 %", {
        "food_cost_pct_override": 0.35,
    })

    # Scenario 1.8: Combined pressure — higher wages + higher food costs
    # Simulates realistic cost squeeze: minimum wage increase + inflation
    _add_scenario(db, week1.id, "Inflační tlak – dražší práce i suroviny", {
        "food_cost_pct_override": 0.33,
        "fixed_cost_week_override": 17500,  # Rent increase
        "staffing_changes": [
            # All Friday dinner staff get implicit rate increase via extra headcount cost
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 0},
        ],
    })

    # Scenario 1.9: Price discount to drive volume — lunch special -10%
    # Tests if lower prices generate enough extra volume to compensate
    _add_scenario(db, week1.id, "Obědové menu se slevou –10 %", {
        "price_change": {"type": "percent", "value": -0.10},
        "arrivals_multiplier": 1.15,  # Assumed boost from promotion
    })

    # Scenario 1.10: Catastrophic understaffing — skeleton crew on Saturday
    # Massive balking: 2/3 of Saturday groups walk out due to extreme waits
    # Saturday is ~23% of weekly revenue so -67% Sat demand ≈ -15% overall
    _add_scenario(db, week1.id, "Sobota – kritický nedostatek personálu", {
        "arrivals_multiplier": 0.85,  # ~-15% week revenue from Saturday chaos
        "staffing_changes": [
            # Skeleton crew: remove 2 kitchen + 2 service from all Saturday dayparts
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": -2},
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "service", "delta_staff": -2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": -2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": -2},
        ],
    })

    # ═══════════════════════════════════════════════════════════════════
    # WEEK 2 SCENARIOS (Duben – jarní sezóna)
    # Spring season — focuses on terrace/capacity and seasonal effects
    # ═══════════════════════════════════════════════════════════════════

    # Scenario 2.1: Baseline — spring as-is (reference for seasonal comparison)
    _add_scenario(db, week2.id, "Jarní základ – beze změn", {})

    # Scenario 2.2: Terrace opens — +5 tables, +20 seats
    # Extra capacity captures walk-in demand that was previously turned away (+12%)
    _add_scenario(db, week2.id, "Otevření terasy – +5 stolů (+20 míst)", {
        "capacity_changes": {"tables_count": 5, "seats_total": 20},
        "arrivals_multiplier": 1.12,  # Terrace visibility attracts extra walk-ins
    })

    # Scenario 2.3: Terrace + extra staff to handle it
    # Combined scenario: more seats AND more people to serve them
    _add_scenario(db, week2.id, "Terasa + posílení personálu", {
        "capacity_changes": {"tables_count": 5, "seats_total": 20},
        "staffing_changes": [
            # Add 1 waiter to Friday and Saturday dinner (terrace service)
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
            # Add 1 cook for the increased volume
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
        ],
    })

    # Scenario 2.4: Seasonal menu premium — spring tasting menu at +12% price
    # Higher-end offer with slight demand reduction from elasticity
    _add_scenario(db, week2.id, "Jarní degustační menu +12 %", {
        "price_change": {"type": "percent", "value": 0.12},
    })

    # Scenario 2.5: Extended opening hours — open until 23:00 on Fri/Sat
    # Late-night slot adds ~+12% arrivals (late diners & theatre crowd)
    # Extra staff needed for the extra hour on both nights
    _add_scenario(db, week2.id, "Prodlouženo do 23:00 Pá+So", {
        "opening_hours_changes": [
            {"weekday": 4, "open_time": "11:30", "close_time": "23:00"},
            {"weekday": 5, "open_time": "11:30", "close_time": "23:00"},
        ],
        "arrivals_multiplier": 1.12,  # Late-night slot captures extra ~+12% Fri/Sat revenue
        "staffing_changes": [
            # 1 extra cook + 1 waiter for late shift Fri & Sat
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 1},
        ],
    })

    # Scenario 2.6: Rainy week — demand drops 15%
    # Simulates bad weather killing terrace traffic
    _add_scenario(db, week2.id, "Deštivý týden – –15 % návštěvnost", {
        "arrivals_multiplier": 0.85,
    })

    # Scenario 2.7: Terrace open but no extra staff — capacity mismatch
    # More seats attract extra guests (+12%) but the same kitchen/service staff
    # get overwhelmed → longer waits → balking → net demand partly lost (-5%)
    _add_scenario(db, week2.id, "Terasa bez personálu – přetížení", {
        "capacity_changes": {"tables_count": 5, "seats_total": 20},
        "arrivals_multiplier": 1.06,  # +12% attracted, -6% lost to balking = net +6%
        # No staffing changes — intentional mismatch; worse than Sc 2.3 with staff
    })

    # Scenario 2.8: Competitor opens nearby — demand loss + price war
    # Tests a double hit: fewer customers AND lower prices
    _add_scenario(db, week2.id, "Nová konkurence – pokles + cenový boj", {
        "arrivals_multiplier": 0.80,
        "price_change": {"type": "percent", "value": -0.08},
    })

    # Scenario 2.9: Negotiate better supplier — food cost drops to 26%
    # Tests upside scenario: improved procurement
    _add_scenario(db, week2.id, "Lepší dodavatel – food cost 26 %", {
        "food_cost_pct_override": 0.26,
    })

    # Scenario 2.10: Dream scenario — everything goes right
    # Terrace + extra staff + demand up + slightly premium pricing
    _add_scenario(db, week2.id, "Ideální jaro – vše klapne", {
        "capacity_changes": {"tables_count": 5, "seats_total": 20},
        "staffing_changes": [
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 1},
        ],
        "arrivals_multiplier": 1.10,
        "price_change": {"type": "percent", "value": 0.05},
        "food_cost_pct_override": 0.28,
    })

    # ═══════════════════════════════════════════════════════════════════
    # WEEK 3 SCENARIOS (Prosinec – vánoční špička)
    # Holiday rush — corporate events, peak stress, premium pricing
    # ═══════════════════════════════════════════════════════════════════

    # Scenario 3.1: Holiday baseline — as-is, already at peak
    _add_scenario(db, week3.id, "Vánoční základ – beze změn", {})

    # Scenario 3.2: Christmas prix fixe menu — +18% average spend
    # Special holiday menu; demand is inelastic during holidays (elasticity -0.8)
    _add_scenario(db, week3.id, "Vánoční degustace +18 %", {
        "price_change": {"type": "percent", "value": 0.18},
    })

    # Scenario 3.3: Corporate event Thursday — massive dinner spike
    # One big corporate booking floods Thursday dinner with +40% arrivals
    _add_scenario(db, week3.id, "Firemní večírek – čtvrtek +40 % dinner", {
        "arrivals_multiplier": 1.15,  # Overall week effect from one big event
        "staffing_changes": [
            # Extra staff just for Thursday dinner to handle the event
            {"weekday": 3, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 2},
            {"weekday": 3, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 3},
        ],
    })

    # Scenario 3.4: Sick call — 2 cooks out on Friday
    # Worst timing: peak season + understaffed kitchen → heavy balking on peak night
    # Friday is ~18% of week revenue; severe kitchen shortage loses ~-10% week-wide
    _add_scenario(db, week3.id, "Nemocní kuchaři – pátek –2 v kuchyni", {
        "arrivals_multiplier": 0.90,  # ~-10% weekly: Friday bottleneck drives groups away
        "staffing_changes": [
            {"weekday": 4, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": -1},
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": -2},
        ],
    })

    # Scenario 3.5: Hire temporary holiday staff — 2 extra everywhere Fri+Sat
    # Tests if the investment in temp workers pays off during peak
    _add_scenario(db, week3.id, "Vánoční brigádníci – posílení Pá+So", {
        "staffing_changes": [
            {"weekday": 4, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": 1},
            {"weekday": 4, "daypart_id": dp_ids[0], "role": "service", "delta_staff": 1},
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 2},
            {"weekday": 4, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "service", "delta_staff": 1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": 2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": 2},
        ],
    })

    # Scenario 3.6: Everything expensive — holiday premium + cost inflation
    # Premium pricing + higher food cost + higher fixed costs (holiday bonuses)
    _add_scenario(db, week3.id, "Vánoční premium + inflace nákladů", {
        "price_change": {"type": "percent", "value": 0.15},
        "food_cost_pct_override": 0.34,    # Premium ingredients for holiday menu
        "fixed_cost_week_override": 20000,  # Holiday bonuses, decorations, etc.
    })

    # Scenario 3.7: Capacity constrained — no extra tables, huge demand
    # Tests what happens when demand far exceeds seating (40 seats vs 38 Sat dinner groups)
    _add_scenario(db, week3.id, "Kapacitní strop – plná obsazenost", {
        "arrivals_multiplier": 1.25,  # Even more demand on top of peak
        # No capacity changes — intentionally constrained
    })

    # Scenario 3.8: Extend to Sunday opening — capture holiday shoppers
    # Edge case: opening on a normally closed day
    _add_scenario(db, week3.id, "Výjimečně otevřeno v neděli", {
        "opening_hours_changes": [
            {"weekday": 6, "open_time": "11:30", "close_time": "20:00"},
        ],
        # Implicit: Sunday has 0 baseline demand, so this tests if the system handles
        # the edge case of opening a day with no historical data
    })

    # Scenario 3.9: Aggressive discount to fill Tue/Wed — targeted off-peak promo
    # Lower prices to boost quiet early-week days
    _add_scenario(db, week3.id, "Úterní/středeční sleva –12 %", {
        "price_change": {"type": "percent", "value": -0.12},
        "arrivals_multiplier": 1.20,  # Expected demand response to discount
    })

    # Scenario 3.10: Worst case — staff shortage + demand spike + cost explosion
    # Stress test: everything goes wrong simultaneously
    # Kitchen down 2 on Saturday, demand +30%, food cost 38%, high fixed costs
    _add_scenario(db, week3.id, "Noční můra – vše špatně najednou", {
        # Demand drops -30 %: bad reviews after a chaotic Saturday go viral overnight
        "arrivals_multiplier": 0.70,
        "food_cost_pct_override": 0.38,      # ingredient prices spike (+8 pp)
        "fixed_cost_week_override": 22000,   # emergency repairs / extra cleaning
        "staffing_changes": [
            # Saturday skeleton crew — 2 cooks and 2 waiters call in sick
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "kitchen", "delta_staff": -2},
            {"weekday": 5, "daypart_id": dp_ids[0], "role": "service", "delta_staff": -1},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "kitchen", "delta_staff": -2},
            {"weekday": 5, "daypart_id": dp_ids[2], "role": "service", "delta_staff": -2},
        ],
    })

    # ─── Commit everything ────────────────────────────────────────────
    db.commit()

    return {
        "status": "seeded",
        "detail": (
            "Presentation dataset created: 'U Zlatého lva', 3 dayparts, 3 baseline weeks "
            "(Feb/Apr/Dec 2025), 30 scenarios, staffing, costs, simulation params."
        ),
        "weeks": [
            {"id": week1.id, "label": week1.label},
            {"id": week2.id, "label": week2.label},
            {"id": week3.id, "label": week3.label},
        ],
    }
