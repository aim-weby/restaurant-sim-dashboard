"""
Discrete-Event Simulation (DES) engine for restaurant operations.

This module is the **core computational engine** of the Bachelor's thesis.
It models a restaurant as a multi-resource queueing system using the
SimPy discrete-event simulation framework.

Architecture Overview:
    The restaurant is modelled with three shared resources:
    - **Tables** (``simpy.Container``): Finite seating capacity, shared across
      all customer groups. Groups request seats equal to their party size.
    - **Kitchen** (``simpy.Container``): Staff tokens representing concurrent
      kitchen capacity per daypart. Food prep time follows a triangular dist.
    - **Service** (``simpy.Container``): Staff tokens representing concurrent
      service staff capacity per daypart.

    Customer groups arrive via a **Poisson process** (exponential inter-arrival
    times) within each daypart, proceed through a multi-stage service pipeline:

        Arrival → Wait for table → Wait for kitchen → Prep → Service → Dine → Depart

    At any waiting stage, a group may **balk** (leave without being served) if
    the wait exceeds a configurable threshold.

Stochastic Elements:
    - **Demand noise**: ±N% uniform perturbation on base arrival counts.
    - **Price elasticity**: Adjusts effective demand based on scenario price
      changes using the constant-elasticity model ``demand_delta = ε × ΔP``.
    - **Prep time**: ``Triangular(min, mode, max)`` distribution.
    - **Seat time**: ``Triangular(min, mode, max)`` + optional correlation with
      kitchen wait via the alpha parameter.
    - **Party size**: ``Gaussian(avg_party_size, σ=0.5)``, clamped to ≥1.

Output Metrics (per run):
    Financial: revenue, profit, COGS, labor_cost, fixed_cost
    Demand:    served_groups, lost_groups
    Queue:     avg/p90 wait_table, avg/p90 wait_food, avg/p90 system_time
    Utilization: kitchen, tables, service (ratio of busy time to capacity)

References:
    - SimPy documentation: https://simpy.readthedocs.io/
    - Law, A.M. (2015). Simulation Modeling and Analysis, 5th ed.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, DefaultDict
from collections import defaultdict

import simpy  # type: ignore


# ---------------------------------------------------------------------------
# Input dataclasses
# ---------------------------------------------------------------------------

@dataclass
class DaypartSlot:
    """
    Represents one (weekday, daypart) time block of operational input data.

    Each slot fully describes the demand pattern and staffing levels for a
    single daypart on a single weekday (e.g., "Monday Lunch"). The simulation
    processes all 7×D slots (where D is the number of dayparts) to simulate
    a complete operating week.

    Attributes:
        weekday: Day of week index (0=Monday … 6=Sunday).
        daypart_id: Foreign key linking to the Daypart configuration table.
        start_minutes: Offset in minutes from the start of the simulated week
            (Monday 00:00). E.g., Monday 11:00 → 660, Tuesday 11:00 → 2100.
        duration_minutes: Length of this daypart in minutes (e.g., 180 for a
            3-hour lunch service).
        arrivals_groups: Baseline expected number of customer groups arriving
            during this slot, before demand noise and price elasticity are applied.
        avg_spend_per_group: Average revenue generated per customer group (CZK).
        avg_party_size: Mean number of guests per arriving group (used for seat
            allocation from the tables resource).
        kitchen_staff: Number of kitchen staff on duty during this slot (each
            staff member = 1 concurrent kitchen token in the simulation).
        service_staff: Number of service staff on duty during this slot.
    """
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
    """
    Configurable simulation parameters for the DES engine.

    These parameters control the stochastic distributions, customer behaviour
    models, and external scenario inputs. They correspond to the "Simulation
    Parameters" settings page in the frontend UI.

    Attributes:
        prep_time_min/mode/max: Parameters of the Triangular distribution for
            kitchen preparation time (minutes). Must satisfy: min ≤ mode ≤ max.
        seat_time_min/mode/max: Parameters of the Triangular distribution for
            customer dining (seat) time (minutes).
        alpha_seat_wait: Correlation coefficient between food wait time and
            seat time. Effective seat time = base_seat + alpha × wait_food.
            When α > 0, longer kitchen waits lead to longer overall stays.
        balking_wait_table_limit: Maximum minutes a group will wait for a table
            before leaving (balking). 0 = balking disabled (infinite patience).
        balking_wait_food_limit: Maximum minutes a group will wait for kitchen
            service before leaving. 0 = disabled.
        price_elasticity: Constant price elasticity of demand (typically negative,
            e.g., -1.2). Used to adjust arrivals based on scenario price changes.
        demand_noise_pct: Amplitude of uniform demand noise applied to base
            arrivals. 0.2 = ±20% random variation per daypart per run.
        price_delta: Fractional price change from the scenario (e.g., 0.10 for
            a +10% price increase). Applied via the elasticity model.
    """
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
    """
    Deterministic cost structure for profit computation.

    These values are pre-computed from the database before simulation and
    remain constant across all stochastic runs. Profit is calculated as:
        profit = revenue − COGS − labor_cost − fixed_cost_week

    Attributes:
        fixed_cost_week: Total fixed costs per week (rent, utilities, etc.) in CZK.
        food_cost_pct: Food cost as a fraction of revenue (0.30 = 30% COGS ratio).
        labor_cost: Pre-computed total weekly labor cost in CZK, derived from
            staffing plan entries (staff_count × hourly_rate × hours_in_daypart).
    """
    fixed_cost_week: float = 0.0
    food_cost_pct: float = 0.30
    labor_cost: float = 0.0  # pre-computed deterministic


# ---------------------------------------------------------------------------
# Metrics collector
# ---------------------------------------------------------------------------

@dataclass
class _Metrics:
    """
    Internal accumulator for per-run simulation metrics.

    Collects raw observations during a single simulation run. After the run
    completes, these are aggregated into summary statistics (mean, percentiles).

    Attributes:
        served_groups: Count of customer groups that completed the full
            service pipeline (arrival through departure).
        lost_groups: Count of groups that balked (left due to exceeded wait).
        revenue: Total revenue from all served groups (CZK).
        wait_table_list: Per-group wait times (minutes) for table availability.
        wait_food_list: Per-group wait times for kitchen service.
        system_time_list: Per-group total time in system (arrival to departure).
        kitchen_busy_time: Total minutes of kitchen resource utilization.
        service_busy_time: Total minutes of service resource utilization.
        tables_busy_time: Total seat-minutes of table utilization.
        kitchen/service/tables_capacity_minutes: Theoretical maximum capacity
            (used as denominator for utilization ratio calculation).
    """
    arrived_groups: int = 0
    served_groups: int = 0
    lost_groups: int = 0
    lost_no_kitchen_staff: int = 0
    revenue: float = 0.0
    wait_table_list: list = field(default_factory=list)
    wait_food_list: list = field(default_factory=list)
    system_time_list: list = field(default_factory=list)
    kitchen_busy_time: DefaultDict[int, float] = field(default_factory=lambda: defaultdict(float))
    service_busy_time: DefaultDict[int, float] = field(default_factory=lambda: defaultdict(float))
    tables_busy_time: float = 0.0
    kitchen_capacity_minutes: DefaultDict[int, float] = field(default_factory=lambda: defaultdict(float))
    service_capacity_minutes: DefaultDict[int, float] = field(default_factory=lambda: defaultdict(float))
    tables_capacity_minutes: float = 0.0


# ---------------------------------------------------------------------------
# Statistical helpers
# ---------------------------------------------------------------------------

def _percentile(values: List[float], p: float) -> float:
    """
    Compute the p-th percentile of a list of values using linear interpolation.

    Uses the same interpolation method as NumPy's ``np.percentile(…, method='linear')``,
    avoiding a NumPy dependency to keep the simulation package lightweight.

    Args:
        values: List of numeric observations. May be empty.
        p: Percentile as a fraction in [0.0, 1.0] (e.g., 0.90 for the 90th percentile).

    Returns:
        The interpolated percentile value; 0.0 if the input is empty.
    """
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
    """Compute the arithmetic mean. Returns 0.0 for empty input."""
    return sum(values) / len(values) if values else 0.0


def _summarize(values: List[float]) -> Dict[str, float]:
    """
    Produce a four-point statistical summary of a metric across simulation runs.

    Returns:
        Dict with keys 'mean', 'p10', 'p50' (median), and 'p90', providing a
        compact view of central tendency and distributional spread.
    """
    return {
        "mean": _mean(values),
        "p50": _percentile(values, 0.50),
        "p10": _percentile(values, 0.10),
        "p90": _percentile(values, 0.90),
    }

def _safe_cancel(env, evt):
    """Remove a pending ContainerGet from the resource queue."""
    try:
        res = getattr(evt, 'resource', getattr(evt, '_resource', None))
        if res:
            for q_name in ['get_queue', '_get_queue', 'queue']:
                q = getattr(res, q_name, None)
                if q is not None and isinstance(q, list):
                    if evt in q:
                        q.remove(evt)
                        return
    except Exception:
        pass



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
    """
    Execute a single one-week discrete-event simulation run.

    This function sets up a SimPy environment, creates shared resources
    (tables, kitchen, service), schedules all daypart arrival processes,
    runs the simulation, and returns a flat dictionary of raw metric values.

    Process Flow (per customer group):
        1. Group arrives during the daypart's Poisson arrival process.
        2. Requests ``party_size`` seats from the tables Container.
           May balk if ``balking_wait_table_limit`` is exceeded.
        3. Requests 1 kitchen token; may balk on food wait limit.
        4. Kitchen prepares food (``Triangular`` distribution).
        5. Kitchen token released; optional service interaction.
        6. Group dines (``Triangular`` seat time + alpha × food_wait correlation).
        7. Seats released; metrics recorded.

    Args:
        slots: List of DaypartSlot objects describing the full week's demand
            and staffing configuration across all weekday × daypart combinations.
        sim_params: Stochastic distribution parameters and scenario overrides.
        costs: Deterministic cost inputs for profit calculation.
        seats_total: Total number of seats in the restaurant (table capacity).
        seed: Random seed for this specific run (ensures reproducibility).

    Returns:
        Dictionary mapping metric keys (e.g., 'finance.revenue', 'util.kitchen')
        to their raw numeric values for this single simulation run.
    """

    rng = random.Random(seed)
    env = simpy.Environment()

    # --- Resource initialization ---
    # Tables modelled as a Container with capacity = total seats.
    # Groups request party_size units; multiple groups can share capacity.
    tables = simpy.Container(env, capacity=seats_total, init=seats_total)

    # Kitchen & service tokens: Container capacity = max staff across all dayparts.
    # Tokens are dynamically filled/drained at daypart boundaries to simulate
    # changing staff levels throughout the week.
    kitchen = simpy.Container(env, capacity=max(1, max((s.kitchen_staff for s in slots), default=1)), init=0)
    service = simpy.Container(env, capacity=max(1, max((s.service_staff for s in slots), default=1)), init=0)

    # Internal metrics accumulator for this run
    m = _Metrics()

    # Compute theoretical capacity denominators for utilization ratios
    for slot in slots:
        m.kitchen_capacity_minutes[slot.daypart_id] += slot.duration_minutes * slot.kitchen_staff
        m.service_capacity_minutes[slot.daypart_id] += slot.duration_minutes * slot.service_staff
        m.tables_capacity_minutes += slot.duration_minutes * seats_total

    # --- Effective arrivals computation ---------------------------------
    def _effective_arrivals(base: int) -> int:
        """
        Apply demand noise and price elasticity to the baseline arrival count.

        The effective demand formula is:
            effective = base × (1 + U(-noise, +noise)) × (1 + ε × ΔP)

        Where U is a uniform random perturbation and ε×ΔP is the constant
        elasticity demand adjustment from scenario price changes.

        Args:
            base: Baseline arrival count from the DaypartSlot.

        Returns:
            Non-negative integer of effective arrivals for this run.
        """
        noise = 1.0 + rng.uniform(-sim_params.demand_noise_pct, sim_params.demand_noise_pct)
        demand = 1.0 + sim_params.price_elasticity * sim_params.price_delta
        return max(0, round(base * noise * demand))

    # --- Group process --------------------------------------------------
    def _group_process(env: simpy.Environment, spend: float, party_size: int, daypart_id: int, current_kitchen_staff: int):
        """
        SimPy process representing a single customer group's journey through
        the restaurant service pipeline.

        Stages: table_wait → kitchen_wait → prep → service → dine → depart.
        At each wait stage, the group may balk if patience limits are exceeded.

        Args:
            env: The SimPy simulation environment.
            spend: Revenue this group contributes if fully served (CZK).
            party_size: Number of seats this group requires.
            daypart_id: The ID of the daypart when this group arrived.
            current_kitchen_staff: The scheduled kitchen staff for this daypart.
        """
        m.arrived_groups += 1
        arrival = env.now
        ps = max(1, party_size)

        # Stage 1: Wait for table (seats)
        start_wait_table = env.now
        if sim_params.balking_wait_table_limit > 0:
            # Try to get seats with timeout — if timeout fires first, customer balks
            get_evt = tables.get(ps)
            result = yield get_evt | env.timeout(sim_params.balking_wait_table_limit)
            if get_evt not in result:
                # Timed out — group leaves (balk)
                _safe_cancel(env, get_evt)
                m.lost_groups += 1
                return
        else:
            # Infinite patience — wait indefinitely for seats
            yield tables.get(ps)

        wait_table = env.now - start_wait_table
        m.wait_table_list.append(wait_table)
        
        seated_at = env.now

        # Stage 2: Wait for kitchen token
        if current_kitchen_staff == 0:
            m.lost_no_kitchen_staff += 1
            yield tables.put(ps)
            return

        start_wait_food = env.now
        if sim_params.balking_wait_food_limit > 0:
            remaining_food_patience = sim_params.balking_wait_food_limit - wait_table
            if remaining_food_patience <= 0:
                yield tables.put(ps)
                m.lost_groups += 1
                return
                
            get_k = kitchen.get(1)
            result = yield get_k | env.timeout(remaining_food_patience)
            if get_k not in result:
                # Balk — release occupied seats before leaving
                _safe_cancel(env, get_k)      # ← prevent ghost token consumption
                yield tables.put(ps)
                m.lost_groups += 1
                return
        else:
            yield kitchen.get(1)

        # Stage 3: Food preparation (triangular distribution)
        prep = rng.triangular(
            sim_params.prep_time_min,
            sim_params.prep_time_max,
            sim_params.prep_time_mode,
        )
        
        if sim_params.balking_wait_food_limit > 0:
            remaining_after_queue = sim_params.balking_wait_food_limit - (env.now - seated_at)
            if prep > remaining_after_queue:
                yield kitchen.put(1)
                yield tables.put(ps)
                m.lost_groups += 1
                return

        m.kitchen_busy_time[daypart_id] += prep
        yield env.timeout(prep)

        # Release kitchen token — frees capacity for the next order
        yield kitchen.put(1)

        wait_food = env.now - start_wait_food
        m.wait_food_list.append(wait_food)

        # Stage 4: Brief service interaction (simplified to 1 minute)
        if service.level > 0:
            yield service.get(1)
            service_time = 1.0  # 1 minute simplified
            m.service_busy_time[daypart_id] += service_time
            yield env.timeout(service_time)
            yield service.put(1)

        # Stage 5: Dining (seat time with optional wait-correlation)
        # Correlation model: longer food wait → longer overall stay
        base_seat = rng.triangular(
            sim_params.seat_time_min,
            sim_params.seat_time_max,
            sim_params.seat_time_mode,
        )
        seat_time = base_seat + sim_params.alpha_seat_wait * wait_food
        m.tables_busy_time += seat_time * ps  # seat-minutes consumed
        yield env.timeout(seat_time)

        # Stage 6: Departure — release seats, record metrics
        yield tables.put(ps)

        m.served_groups += 1
        m.revenue += spend
        m.system_time_list.append(env.now - arrival)

    # --- Daypart process ------------------------------------------------
    def _run_daypart(env: simpy.Environment, slot: DaypartSlot):
        """
        SimPy process managing a single daypart's lifecycle.

        Handles: waiting until start time, filling resource tokens for staff
        on duty, generating Poisson arrivals, waiting for the slot to end,
        and draining tokens before the next daypart begins.

        Args:
            env: The SimPy simulation environment.
            slot: The DaypartSlot configuration to process.
        """
        # Wait until this daypart's scheduled start time
        if env.now < slot.start_minutes:
            yield env.timeout(slot.start_minutes - env.now)

        # Fill kitchen and service tokens for this daypart's staff levels
        k_amount = min(slot.kitchen_staff, kitchen.capacity - kitchen.level)
        if k_amount > 0:
            yield kitchen.put(k_amount)
        s_amount = min(slot.service_staff, service.capacity - service.level)
        if s_amount > 0:
            yield service.put(s_amount)

        # Compute effective arrivals (with noise + price elasticity)
        arrivals_eff = _effective_arrivals(slot.arrivals_groups)

        if arrivals_eff <= 0 or slot.duration_minutes <= 0:
            yield env.timeout(slot.duration_minutes)
            return

        # Generate arrivals as a Poisson process (exponential inter-arrivals)
        # Rate λ = effective_arrivals / duration_minutes (arrivals per minute)
        lam = arrivals_eff / slot.duration_minutes
        t_end = env.now + slot.duration_minutes
        while env.now < t_end:
            interarrival = rng.expovariate(lam) if lam > 0 else float("inf")
            if env.now + interarrival >= t_end:
                break
            yield env.timeout(interarrival)

            # Spawn a new customer group process
            party_size = max(1, round(rng.gauss(slot.avg_party_size, 0.5)))
            env.process(_group_process(env, slot.avg_spend_per_group, party_size, slot.daypart_id, slot.kitchen_staff))

        # Wait for the remainder of the daypart (let in-progress groups continue)
        remaining = t_end - env.now
        if remaining > 0:
            yield env.timeout(remaining)

        # Drain staff tokens (reduce capacity before the next daypart)
        drained_k = min(slot.kitchen_staff, kitchen.level)
        if drained_k > 0:
            yield kitchen.get(drained_k)
        drained_s = min(slot.service_staff, service.level)
        if drained_s > 0:
            yield service.get(drained_s)

    # --- Schedule and run -----------------------------------------------
    # Launch all daypart processes, sorted by start time to ensure
    # chronological execution of daypart lifecycle events
    for slot in sorted(slots, key=lambda s: s.start_minutes):
        env.process(_run_daypart(env, slot))

    # Run until all dayparts complete + 120-minute buffer for
    # stragglers (groups still dining when the last daypart ends)
    last_end = max((s.start_minutes + s.duration_minutes for s in slots), default=0)
    env.run(until=last_end + 120)

    # --- Compute final metrics ------------------------------------------
    profit = (
        m.revenue
        - m.revenue * costs.food_cost_pct
        - costs.labor_cost
        - costs.fixed_cost_week
    )

    incomplete = max(0, m.arrived_groups - m.served_groups - m.lost_groups - m.lost_no_kitchen_staff)

    res = {
        "finance.revenue": m.revenue,
        "finance.profit": profit,
        "finance.cogs": m.revenue * costs.food_cost_pct,
        "finance.labor_cost": costs.labor_cost,
        "finance.fixed_cost": costs.fixed_cost_week,
        "demand.arrived_groups": float(m.served_groups + m.lost_groups + m.lost_no_kitchen_staff + incomplete),
        "demand.served_groups": float(m.served_groups),
        "demand.lost_groups": float(m.lost_groups),
        "demand.lost_no_kitchen_staff": float(m.lost_no_kitchen_staff),
        "demand.incomplete_at_close": float(incomplete),
        "queue.wait_table": _mean(m.wait_table_list),
        "queue.wait_table_p90": _percentile(m.wait_table_list, 0.90),
        "queue.wait_food": _mean(m.wait_food_list),
        "queue.wait_food_p90": _percentile(m.wait_food_list, 0.90),
        "time.system_time": _mean(m.system_time_list),
        "time.system_time_p90": _percentile(m.system_time_list, 0.90),
        "util.tables": m.tables_busy_time / m.tables_capacity_minutes if m.tables_capacity_minutes > 0 else 0,
    }

    # Add per-daypart utilizations dynamically
    kitchen_utils = []
    for dp_id, cap in m.kitchen_capacity_minutes.items():
        val = m.kitchen_busy_time[dp_id] / cap if cap > 0 else 0
        res[f"util.kitchen.{dp_id}"] = val
        kitchen_utils.append(val)
        
    service_utils = []
    for dp_id, cap in m.service_capacity_minutes.items():
        val = m.service_busy_time[dp_id] / cap if cap > 0 else 0
        res[f"util.service.{dp_id}"] = val
        service_utils.append(val)
        
    # Add backward-compatible flat keys (mean across all dayparts)
    res["util.kitchen"] = sum(kitchen_utils) / len(kitchen_utils) if kitchen_utils else 0
    res["util.service"] = sum(service_utils) / len(service_utils) if service_utils else 0

    return res


# ---------------------------------------------------------------------------
# Multi-run runner
# ---------------------------------------------------------------------------

def run_simulation(
    slots: List[DaypartSlot],
    sim_params: SimParams,
    costs: CostInputs,
    seats_total: int,
    runs: int = 1000,
    base_seed: int = 42,
) -> Dict:
    """
    Execute N independent simulation runs and aggregate results.

    Each run uses a deterministic seed (``base_seed + i``) to ensure
    reproducibility while providing independent stochastic variation.
    Results are aggregated across runs to produce distributional summaries
    (mean, p10, p50, p90) for every metric.

    This is the primary entry point called by the ``/simulation/run`` API
    endpoint and the experiment runner.

    Args:
        slots: Complete week description (all weekday × daypart combinations).
        sim_params: Stochastic parameters and scenario overrides.
        costs: Deterministic cost structure.
        seats_total: Restaurant seating capacity.
        runs: Number of independent Monte Carlo replications (default: 1000).
        base_seed: Starting seed; run i uses seed = base_seed + i.

    Returns:
        Dictionary with 'runs' count and 'metrics' mapping each metric key
        to a summary dict {'mean', 'p10', 'p50', 'p90'}.
    """

    all_results: List[Dict[str, float]] = []
    for i in range(runs):
        metrics = simulate_week(slots, sim_params, costs, seats_total, seed=base_seed + i)
        all_results.append(metrics)

    # Aggregate each metric across all N runs into distributional summaries
    metric_keys = all_results[0].keys() if all_results else []
    summary: Dict[str, Dict[str, float]] = {}
    for key in metric_keys:
        values = [r[key] for r in all_results]
        summary[key] = _summarize(values)

    return {
        "runs": runs,
        "metrics": summary,
    }
