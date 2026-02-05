import random
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class CellInput:
    weekday: int
    daypart_id: int
    arrivals_groups: int
    avg_spend_per_group: float
    avg_party_size: float

@dataclass
class StaffingInput:
    weekday: int
    daypart_id: int
    role: str   # kitchen/service
    staff_count: int
    hourly_rate: float
    hours_in_daypart: float

@dataclass
class CostInputs:
    fixed_cost_week: float
    food_cost_pct: float

def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * p
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    return values_sorted[f] + (values_sorted[c] - values_sorted[f]) * (k - f)

def summarize(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"mean": 0.0, "p10": 0.0, "p50": 0.0, "p90": 0.0}
    mean = sum(values) / len(values)
    return {
        "mean": mean,
        "p10": percentile(values, 0.10),
        "p50": percentile(values, 0.50),
        "p90": percentile(values, 0.90),
    }

def run_monte_carlo(
    cells: List[CellInput],
    staffing: List[StaffingInput],
    costs: CostInputs,
    runs: int = 200,
    seed: int | None = None,
    # jednoduché “nejistoty”
    arrivals_sigma: float = 0.20,  # +-20%
    spend_sigma: float = 0.10,     # +-10%
) -> Dict:
    rng = random.Random(seed)

    # staffing kapacity (MVP): jednoduchý capacity score
    # kitchen cap = staff_count * hours * 10 groups/hour (heuristika)
    # service cap = staff_count * hours * 12 groups/hour
    cap_kitchen = {}
    cap_service = {}

    for s in staffing:
        key = (s.weekday, s.daypart_id)
        if s.role == "kitchen":
            cap_kitchen[key] = cap_kitchen.get(key, 0.0) + s.staff_count * s.hours_in_daypart * 10.0
        if s.role == "service":
            cap_service[key] = cap_service.get(key, 0.0) + s.staff_count * s.hours_in_daypart * 12.0

    revenue_runs = []
    cogs_runs = []
    labor_runs = []
    profit_runs = []
    lost_groups_runs = []

    # labor cost je deterministický (na týden) – lze později randomizovat
    labor_cost = 0.0
    for s in staffing:
        labor_cost += s.staff_count * s.hourly_rate * s.hours_in_daypart

    for _ in range(runs):
        revenue = 0.0
        lost_groups = 0.0

        for c in cells:
            # náhodná variace arrivals a spend (logicky zůstane >=0)
            a = max(0.0, rng.gauss(c.arrivals_groups, c.arrivals_groups * arrivals_sigma))
            s = max(0.0, rng.gauss(c.avg_spend_per_group, c.avg_spend_per_group * spend_sigma))

            key = (c.weekday, c.daypart_id)
            kitchen_cap = cap_kitchen.get(key, float("inf"))
            service_cap = cap_service.get(key, float("inf"))
            cap = min(kitchen_cap, service_cap)

            served = min(a, cap)
            lost = max(0.0, a - served)

            revenue += served * s
            lost_groups += lost

        cogs = revenue * costs.food_cost_pct
        profit = revenue - cogs - labor_cost - costs.fixed_cost_week

        revenue_runs.append(revenue)
        cogs_runs.append(cogs)
        labor_runs.append(labor_cost)
        profit_runs.append(profit)
        lost_groups_runs.append(lost_groups)

    return {
        "runs": runs,
        "metrics": {
            "finance.revenue": summarize(revenue_runs),
            "finance.cogs": summarize(cogs_runs),
            "finance.labor_cost": summarize(labor_runs),
            "finance.fixed_cost": {"mean": costs.fixed_cost_week, "p10": costs.fixed_cost_week, "p50": costs.fixed_cost_week, "p90": costs.fixed_cost_week},
            "finance.profit": summarize(profit_runs),
            "demand.lost_groups": summarize(lost_groups_runs),
        },
        "assumptions": {
            "arrivals_sigma": arrivals_sigma,
            "spend_sigma": spend_sigma,
            "capacity_heuristics": {"kitchen_groups_per_hour": 10.0, "service_groups_per_hour": 12.0},
        },
    }