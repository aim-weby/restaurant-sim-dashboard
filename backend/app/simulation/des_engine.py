"""
Discrete-Event Simulation engine for restaurant operations.

Uses SimPy to model:
- Tables (seats_total) as a Container resource
- Kitchen (staff_count per daypart) as Container tokens
- Service (staff_count per daypart) as Container tokens
- Poisson arrivals per daypart
- Triangular distributions for prep_time and seat_time
- Price elasticity + demand noise
- Balking (customer leaves if wait exceeds limit)
- Correlation: seat_time = base + alpha * kitchen_wait

Per-run metrics collected:
  revenue, profit, served_groups, lost_groups,
  avg/p90 wait_table, avg/p90 wait_food, avg/p90 system_time,
  util_kitchen, util_tables, util_service
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List

import simpy  # type: ignore


# ---------------------------------------------------------------------------
# Input dataclasses
# ---------------------------------------------------------------------------

@dataclass
class DaypartSlot:
    """One (weekday, daypart) block of input data."""
    weekday: int  # 0..6
    daypart_id: int
    start_minutes: float  # offset from start-of-week (Mon 00:00)
    duration_minutes: float
    arrivals_groups: int
    avg_spend_per_group: float
    avg_party_size: float
    kitchen_staff: int
    service_staff: int


@dataclass
class SimParams:
    prep_time_min: float = 5.0
    prep_time_mode: float = 12.0
    prep_time_max: float = 25.0
    seat_time_min: float = 30.0
    seat_time_mode: float = 45.0
    seat_time_max: float = 75.0
    alpha_seat_wait: float = 0.0
    balking_wait_table_limit: float = 0.0  # 0 = disabled
    balking_wait_food_limit: float = 0.0   # 0 = disabled
    price_elasticity: float = -1.2
    demand_noise_pct: float = 0.2
    price_delta: float = 0.0  # from scenario price_change


@dataclass
class CostInputs:
    fixed_cost_week: float = 0.0
    food_cost_pct: float = 0.30
    labor_cost: float = 0.0  # pre-computed deterministic


# ---------------------------------------------------------------------------
# Metrics collector
# ---------------------------------------------------------------------------

@dataclass
class _Metrics:
    served_groups: int = 0
    lost_groups: int = 0
    revenue: float = 0.0
    wait_table_list: list = field(default_factory=list)
    wait_food_list: list = field(default_factory=list)
    system_time_list: list = field(default_factory=list)
    kitchen_busy_time: float = 0.0
    service_busy_time: float = 0.0
    tables_busy_time: float = 0.0
    kitchen_capacity_minutes: float = 0.0
    service_capacity_minutes: float = 0.0
    tables_capacity_minutes: float = 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * p
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def _mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _summarize(values: List[float]) -> Dict[str, float]:
    return {
        "mean": _mean(values),
        "median": _percentile(values, 0.50),
        "p10": _percentile(values, 0.10),
        "p90": _percentile(values, 0.90),
    }


# ---------------------------------------------------------------------------
# Single-run simulation
# ---------------------------------------------------------------------------

def simulate_week(
    slots: List[DaypartSlot],
    sim_params: SimParams,
    costs: CostInputs,
    seats_total: int,
    seed: int,
) -> Dict[str, float]:
    """Run one week of DES and return raw metrics dict."""

    rng = random.Random(seed)
    env = simpy.Environment()

    # Resources ----------------------------------------------------------
    # Tables as a Container (capacity = seats_total)
    tables = simpy.Container(env, capacity=seats_total, init=seats_total)

    # Kitchen & service tokens – we use Container per daypart window
    # but to support varying capacity across dayparts, we'll manage tokens
    # via put/get around each daypart.
    kitchen = simpy.Container(env, capacity=max(1, max((s.kitchen_staff for s in slots), default=1)), init=0)
    service = simpy.Container(env, capacity=max(1, max((s.service_staff for s in slots), default=1)), init=0)

    m = _Metrics()

    # Compute capacity denominators + schedule dayparts -------------------
    for slot in slots:
        m.kitchen_capacity_minutes += slot.duration_minutes * slot.kitchen_staff
        m.service_capacity_minutes += slot.duration_minutes * slot.service_staff
        m.tables_capacity_minutes += slot.duration_minutes * seats_total

    # --- Effective arrivals computation ---------------------------------
    def _effective_arrivals(base: int) -> int:
        noise = 1.0 + rng.uniform(-sim_params.demand_noise_pct, sim_params.demand_noise_pct)
        demand = 1.0 + sim_params.price_elasticity * sim_params.price_delta
        return max(0, round(base * noise * demand))

    # --- Group process --------------------------------------------------
    def _group_process(env: simpy.Environment, spend: float, party_size: int):
        arrival = env.now
        ps = max(1, party_size)

        # 1) Wait for table (seats)
        start_wait_table = env.now
        if sim_params.balking_wait_table_limit > 0:
            # Try to get seats with timeout
            get_evt = tables.get(ps)
            result = yield get_evt | env.timeout(sim_params.balking_wait_table_limit)
            if get_evt not in result:
                # Timed out – balk
                m.lost_groups += 1
                return
        else:
            yield tables.get(ps)

        wait_table = env.now - start_wait_table

        # 2) Wait for kitchen token
        start_wait_food = env.now
        if sim_params.balking_wait_food_limit > 0:
            get_k = kitchen.get(1)
            result = yield get_k | env.timeout(sim_params.balking_wait_food_limit)
            if get_k not in result:
                # Balk – release seats
                yield tables.put(ps)
                m.lost_groups += 1
                return
        else:
            yield kitchen.get(1)

        # 3) Prep time (triangular)
        prep = rng.triangular(
            sim_params.prep_time_min,
            sim_params.prep_time_max,
            sim_params.prep_time_mode,
        )
        m.kitchen_busy_time += prep
        yield env.timeout(prep)

        # Release kitchen token
        yield kitchen.put(1)

        wait_food = env.now - start_wait_food

        # 4) Service (short constant time, simplified)
        if service.level > 0 or True:  # always try to get service token
            yield service.get(1)
            service_time = 1.0  # 1 minute simplified
            m.service_busy_time += service_time
            yield env.timeout(service_time)
            yield service.put(1)

        # 5) Seat time with correlation
        base_seat = rng.triangular(
            sim_params.seat_time_min,
            sim_params.seat_time_max,
            sim_params.seat_time_mode,
        )
        seat_time = base_seat + sim_params.alpha_seat_wait * wait_food
        m.tables_busy_time += seat_time * ps
        yield env.timeout(seat_time)

        # 6) Depart – release seats
        yield tables.put(ps)

        m.served_groups += 1
        m.revenue += spend
        m.wait_table_list.append(wait_table)
        m.wait_food_list.append(wait_food)
        m.system_time_list.append(env.now - arrival)

    # --- Daypart process ------------------------------------------------
    def _run_daypart(env: simpy.Environment, slot: DaypartSlot):
        # Wait until daypart starts
        if env.now < slot.start_minutes:
            yield env.timeout(slot.start_minutes - env.now)

        # Fill tokens for this daypart
        k_amount = min(slot.kitchen_staff, kitchen.capacity - kitchen.level)
        if k_amount > 0:
            yield kitchen.put(k_amount)
        s_amount = min(slot.service_staff, service.capacity - service.level)
        if s_amount > 0:
            yield service.put(s_amount)

        # Compute effective arrivals
        arrivals_eff = _effective_arrivals(slot.arrivals_groups)

        if arrivals_eff <= 0 or slot.duration_minutes <= 0:
            yield env.timeout(slot.duration_minutes)
            return

        # Generate arrivals as Poisson process
        lam = arrivals_eff / slot.duration_minutes  # rate per minute
        t_end = env.now + slot.duration_minutes
        while env.now < t_end:
            interarrival = rng.expovariate(lam) if lam > 0 else float("inf")
            if env.now + interarrival >= t_end:
                break
            yield env.timeout(interarrival)

            # Create group
            party_size = max(1, round(rng.gauss(slot.avg_party_size, 0.5)))
            env.process(_group_process(env, slot.avg_spend_per_group, party_size))

        # Wait for daypart to end (let in-progress groups finish)
        remaining = t_end - env.now
        if remaining > 0:
            yield env.timeout(remaining)

        # Drain tokens (reduce capacity for next daypart)
        drained_k = min(slot.kitchen_staff, kitchen.level)
        if drained_k > 0:
            yield kitchen.get(drained_k)
        drained_s = min(slot.service_staff, service.level)
        if drained_s > 0:
            yield service.get(drained_s)

    # Schedule all daypart processes
    for slot in sorted(slots, key=lambda s: s.start_minutes):
        env.process(_run_daypart(env, slot))

    # Run until all dayparts are done + extra 2h buffer for stragglers
    last_end = max((s.start_minutes + s.duration_minutes for s in slots), default=0)
    env.run(until=last_end + 120)

    # Compute final metrics
    profit = (
        m.revenue
        - m.revenue * costs.food_cost_pct
        - costs.labor_cost
        - costs.fixed_cost_week
    )

    return {
        "finance.revenue": m.revenue,
        "finance.profit": profit,
        "finance.cogs": m.revenue * costs.food_cost_pct,
        "finance.labor_cost": costs.labor_cost,
        "finance.fixed_cost": costs.fixed_cost_week,
        "demand.served_groups": float(m.served_groups),
        "demand.lost_groups": float(m.lost_groups),
        "queue.wait_table": _mean(m.wait_table_list),
        "queue.wait_table_p90": _percentile(m.wait_table_list, 0.90),
        "queue.wait_food": _mean(m.wait_food_list),
        "queue.wait_food_p90": _percentile(m.wait_food_list, 0.90),
        "time.system_time": _mean(m.system_time_list),
        "time.system_time_p90": _percentile(m.system_time_list, 0.90),
        "util.kitchen": m.kitchen_busy_time / m.kitchen_capacity_minutes if m.kitchen_capacity_minutes > 0 else 0,
        "util.tables": m.tables_busy_time / m.tables_capacity_minutes if m.tables_capacity_minutes > 0 else 0,
        "util.service": m.service_busy_time / m.service_capacity_minutes if m.service_capacity_minutes > 0 else 0,
    }


# ---------------------------------------------------------------------------
# Multi-run runner
# ---------------------------------------------------------------------------

def run_simulation(
    slots: List[DaypartSlot],
    sim_params: SimParams,
    costs: CostInputs,
    seats_total: int,
    runs: int = 200,
    base_seed: int = 42,
) -> Dict:
    """Run N simulation runs and return summary (mean/median/p10/p90)."""

    all_results: List[Dict[str, float]] = []
    for i in range(runs):
        metrics = simulate_week(slots, sim_params, costs, seats_total, seed=base_seed + i)
        all_results.append(metrics)

    # Aggregate across runs
    metric_keys = all_results[0].keys() if all_results else []
    summary: Dict[str, Dict[str, float]] = {}
    for key in metric_keys:
        values = [r[key] for r in all_results]
        summary[key] = _summarize(values)

    return {
        "runs": runs,
        "metrics": summary,
    }
