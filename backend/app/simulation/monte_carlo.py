"""
Monte Carlo simulation engine for restaurant financial forecasting.

This module implements a **simplified stochastic model** that predates and
complements the full Discrete-Event Simulation (DES) engine. While the DES
engine (``des_engine.py``) models individual customer journeys through a
multi-resource queueing system, this Monte Carlo engine operates at a
**cell-level abstraction** — each (weekday, daypart) cell is processed
independently with Gaussian perturbations on demand and spend.

Key Differences from the DES Engine:
    - No queueing / resource contention modelling
    - No balking, no wait-time tracking
    - Capacity constraints are applied as a simple min(arrivals, capacity) clamp
    - Faster execution; useful for rapid sensitivity analysis and quick estimates

Usage:
    Called directly by the ``/simulation/run`` API endpoint when the DES engine
    is not applicable (e.g., when no seat configuration is available). Also used
    as a fallback and for deterministic scenario delta calculations.
"""

import random
from dataclasses import dataclass
from typing import List, Dict


# ---------------------------------------------------------------------------
# Input data classes
# ---------------------------------------------------------------------------

@dataclass
class CellInput:
    """
    One (weekday, daypart) demand cell for the Monte Carlo model.

    Represents the baseline expected demand and revenue characteristics for
    a single time block in the weekly operating schedule.

    Attributes:
        weekday: Day of week index (0=Monday … 6=Sunday).
        daypart_id: Foreign key linking to the Daypart configuration.
        arrivals_groups: Expected number of customer groups in this slot.
        avg_spend_per_group: Mean revenue per group (CZK).
        avg_party_size: Mean number of guests per group.
    """
    weekday: int
    daypart_id: int
    arrivals_groups: int
    avg_spend_per_group: float
    avg_party_size: float


@dataclass
class StaffingInput:
    """
    Staffing configuration for one (weekday, daypart, role) combination.

    Used to compute both labour costs (deterministic) and capacity constraints
    (kitchen and service caps).

    Attributes:
        weekday: Day of week index (0=Monday … 6=Sunday).
        daypart_id: Foreign key linking to the Daypart configuration.
        role: Staff role — either 'kitchen' or 'service'.
        staff_count: Number of staff members on duty.
        hourly_rate: Wage rate in CZK per hour.
        hours_in_daypart: Duration of the daypart in hours. Used for both
            labour cost calculation and capacity estimation.
    """
    weekday: int
    daypart_id: int
    role: str   # kitchen/service
    staff_count: int
    hourly_rate: float
    hours_in_daypart: float


@dataclass
class CostInputs:
    """
    Cost structure inputs for profit calculation.

    Attributes:
        fixed_cost_week: Total fixed costs per operating week (CZK).
        food_cost_pct: Food cost as a fraction of revenue (e.g., 0.30 = 30% COGS).
    """
    fixed_cost_week: float
    food_cost_pct: float


# ---------------------------------------------------------------------------
# Statistical helpers
# ---------------------------------------------------------------------------

def percentile(values: List[float], p: float) -> float:
    """
    Compute the p-th percentile using linear interpolation.

    Implements the same algorithm as ``numpy.percentile(…, method='linear')``
    without requiring NumPy, keeping the module dependency-free.

    Args:
        values: List of numeric observations. May be empty.
        p: Percentile as a fraction in [0.0, 1.0].

    Returns:
        Interpolated percentile value; 0.0 for empty input.
    """
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
    """
    Produce a four-point distributional summary across Monte Carlo runs.

    Returns:
        Dict with keys 'mean', 'p10', 'p50' (median), and 'p90'. This summary
        captures both central tendency and the spread of outcomes, enabling the
        frontend to display confidence bands (p10–p90 range).
    """
    if not values:
        return {"mean": 0.0, "p10": 0.0, "p50": 0.0, "p90": 0.0}
    mean = sum(values) / len(values)
    return {
        "mean": mean,
        "p10": percentile(values, 0.10),
        "p50": percentile(values, 0.50),
        "p90": percentile(values, 0.90),
    }


# ---------------------------------------------------------------------------
# Core Monte Carlo simulation
# ---------------------------------------------------------------------------

def run_monte_carlo(
    cells: List[CellInput],
    staffing: List[StaffingInput],
    costs: CostInputs,
    runs: int = 1000,
    seed: int | None = None,
    # Gaussian perturbation amplitudes for stochastic variation
    arrivals_sigma: float = 0.20,  # ±20% noise on arrival counts
    spend_sigma: float = 0.10,     # ±10% noise on spend per group
) -> Dict:
    """
    Execute a Monte Carlo simulation over the restaurant's weekly demand matrix.

    For each of the N independent runs, the model perturbs every demand cell's
    arrival count and average spend using Gaussian noise, applies capacity
    constraints, and computes weekly revenue, COGS, and profit.

    Capacity Model (heuristic):
        - Kitchen capacity = staff_count × hours × 10 groups/hour
        - Service capacity = staff_count × hours × 12 groups/hour
        Groups served = min(perturbed_arrivals, min(kitchen_cap, service_cap))

    Stochastic Model:
        - arrivals ~ N(base, base × arrivals_sigma), clamped to ≥0
        - spend    ~ N(base, base × spend_sigma), clamped to ≥0

    Args:
        cells: List of CellInput objects describing the 7×D weekly demand matrix.
        staffing: List of StaffingInput objects for capacity and labour cost.
        costs: Fixed and variable cost parameters.
        runs: Number of Monte Carlo replications (default: 1000).
        seed: Optional random seed for reproducibility. None = system entropy.
        arrivals_sigma: Standard deviation coefficient for arrival noise.
        spend_sigma: Standard deviation coefficient for spend noise.

    Returns:
        Dictionary containing:
        - 'runs': Number of replications executed
        - 'metrics': Dict mapping each metric key to a {mean, p10, p50, p90} summary
        - 'assumptions': Parameters used for transparency and reproducibility
    """
    rng = random.Random(seed)

    # --- Pre-compute capacity constraints per (weekday, daypart) ---
    # Heuristic: each kitchen staff can handle ~10 groups/hour,
    # each service staff can handle ~12 groups/hour.
    cap_kitchen = {}
    cap_service = {}

    for s in staffing:
        key = (s.weekday, s.daypart_id)
        if s.role == "kitchen":
            cap_kitchen[key] = cap_kitchen.get(key, 0.0) + s.staff_count * s.hours_in_daypart * 10.0
        if s.role == "service":
            cap_service[key] = cap_service.get(key, 0.0) + s.staff_count * s.hours_in_daypart * 12.0

    # Accumulators for per-run outcomes
    revenue_runs = []
    cogs_runs = []
    labor_runs = []
    profit_runs = []
    lost_groups_runs = []

    # Labour cost is deterministic — same every run (could be randomised in future)
    labor_cost = 0.0
    for s in staffing:
        labor_cost += s.staff_count * s.hourly_rate * s.hours_in_daypart

    # --- Main simulation loop ---
    for _ in range(runs):
        revenue = 0.0
        lost_groups = 0.0

        for c in cells:
            # Perturb arrivals and spend with Gaussian noise, clamped to non-negative
            a = max(0.0, rng.gauss(c.arrivals_groups, c.arrivals_groups * arrivals_sigma))
            s = max(0.0, rng.gauss(c.avg_spend_per_group, c.avg_spend_per_group * spend_sigma))

            # Apply capacity constraint: groups served = min(arrivals, capacity)
            key = (c.weekday, c.daypart_id)
            kitchen_cap = cap_kitchen.get(key, float("inf"))
            service_cap = cap_service.get(key, float("inf"))
            cap = min(kitchen_cap, service_cap)

            served = min(a, cap)
            lost = max(0.0, a - served)

            revenue += served * s
            lost_groups += lost

        # Compute derived financial metrics
        cogs = revenue * costs.food_cost_pct
        profit = revenue - cogs - labor_cost - costs.fixed_cost_week

        # Record this run's outcomes
        revenue_runs.append(revenue)
        cogs_runs.append(cogs)
        labor_runs.append(labor_cost)
        profit_runs.append(profit)
        lost_groups_runs.append(lost_groups)

    # --- Aggregate results across all runs ---
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