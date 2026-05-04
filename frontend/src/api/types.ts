/**
 * @fileoverview TypeScript type definitions for all API request/response contracts.
 *
 * This module serves as the **single source of truth** for the data shapes exchanged
 * between the React frontend and the FastAPI backend. Every type defined here mirrors
 * a corresponding Pydantic schema on the backend, ensuring type safety across the
 * full-stack data pipeline.
 *
 * Organisation:
 *   - **Configuration types**: Daypart, Venue, OpeningHoursItem, Costs
 *   - **Baseline data types**: BaselineWeek, BaselineCell, StaffingRow
 *   - **KPI & analytics types**: KpisResponse, DataHealth*, InsightItem
 *   - **Simulation types**: SimulationParams, SimulationOverrides, SimulationResponse
 *   - **Scenario types**: Scenario, ScenarioKpisResponse
 *   - **AI types**: AiInsight, AiChatMessage, AiAdvisorResponse
 *
 * @module api/types
 */

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/**
 * A daypart defines a named time slot in the restaurant's operating day.
 * Examples: "Lunch" (11:00–14:00), "Dinner" (18:00–22:00).
 * Dayparts must not overlap (enforced by the backend validation layer).
 */
export type Daypart = {
    id: number;
    label: string;
    /** Start time in "HH:MM" format (24-hour clock). */
    start_time: string;
    /** End time in "HH:MM" format. Must be after start_time. */
    end_time: string;
    /** Display order for UI rendering (lower = earlier in lists). */
    sort_order: number;
};

/**
 * Restaurant venue configuration — global settings shared across all weeks.
 */
export type Venue = {
    id: number;
    /** Human-readable restaurant name. */
    name: string;
    /** IANA timezone identifier (e.g. "Europe/Prague"). */
    timezone?: string;
    /** ISO 4217 currency code (e.g. "CZK"). */
    currency?: string;
    /** Total seating capacity — used as the tables Container capacity in DES. */
    seats_total: number;
    /** Physical table count (informational; seats_total is the binding constraint). */
    tables_count: number;
    /** Simulation mode selector: "des" (full DES) or "monte_carlo" (simplified). */
    mode: string;
};

/**
 * Daily opening hours for a single weekday.
 */
export type OpeningHoursItem = {
    id?: number;
    /** Day index (0=Monday … 6=Sunday). */
    weekday: number;
    /** Server-provided human-readable label (e.g., "Monday"). */
    weekday_label?: string;
    open_time: string;
    close_time: string;
    /** Whether the restaurant is closed on this day. */
    is_closed: boolean;
};

// ---------------------------------------------------------------------------
// Baseline data types
// ---------------------------------------------------------------------------

/**
 * A baseline week represents one complete weekly demand scenario.
 * Users can create multiple weeks (e.g., "Typical Week", "Summer Week")
 * to model different operating patterns and compare them.
 */
export type BaselineWeek = {
    id: number;
    /** ISO date string for the Monday of this week (e.g., "2026-02-03"). */
    week_start: string;
    /** User-assigned label for identification (e.g., "Peak Season"). */
    label: string;
};

/**
 * One cell in the 7×D baseline demand matrix (weekday × daypart).
 * Contains the expected demand and revenue characteristics for that slot.
 */
export type BaselineCell = {
    id?: number;
    baseline_week_id?: number;
    /** Day index (0=Monday … 6=Sunday). */
    weekday: number;
    /** Foreign key linking to the Daypart configuration. */
    daypart_id: number;
    /** Expected number of arriving customer groups. */
    arrivals_groups: number;
    /** Mean revenue per group (CZK). */
    avg_spend_per_group: number;
    /** Mean guests per group (used for seat allocation in DES). */
    avg_party_size: number;
};

/**
 * Cost configuration — singleton settings applied globally.
 */
export type Costs = {
    id: number;
    /** Total fixed costs per operating week (rent, utilities, etc.) in CZK. */
    fixed_cost_week: number;
    /** Food cost as a fraction of revenue (e.g., 0.30 = 30% COGS ratio). */
    food_cost_pct: number;
};

/**
 * One row of the staffing plan: specifies how many staff of a given role
 * are scheduled for a specific (weekday, daypart) combination.
 */
export type StaffingRow = {
    id?: number;
    weekday: number;
    daypart_id: number;
    /** Staff role — "kitchen" or "service". */
    role: string;
    /** Number of staff members on duty. */
    staff_count: number;
    /** Wage rate in CZK per hour. */
    hourly_rate: number;
    /** Duration of this daypart in hours (for labour cost calculation). */
    hours_in_daypart: number;
};

// ---------------------------------------------------------------------------
// KPI & analytics types
// ---------------------------------------------------------------------------

/**
 * Aggregated KPI response for a baseline week.
 * Contains both scalar KPIs and optional timeseries breakdowns.
 */
export type KpisResponse = {
    baseline_week_id: number;
    /** Flat map of KPI metric keys to their computed values. */
    kpis: Record<string, number>;
    /** Optional timeseries data for charts (by weekday, by daypart, heatmap). */
    timeseries?: {
        by_weekday: Record<string, number | string>[];
        by_daypart: Record<string, number | string>[];
        heatmap: Record<string, number>[];
    };
    /** Debug: raw inputs used for KPI computation (hidden in production). */
    inputs_used?: Record<string, any>;
};

/**
 * Individual data health check result (e.g., "staffing data present").
 */
export type DataHealthCheck = {
    key: string;
    label: string;
    status: "ok" | "missing";
    detail?: string;
};

/**
 * Data completeness and quality assessment for a baseline week.
 * Used to surface warnings when required configuration is missing.
 */
export type DataHealthResponse = {
    baseline_week_id: number;
    /** Percentage of required data that is present (0–100). */
    coverage_score: number;
    /** Score indicating how actionable the data is for simulation (0–100). */
    actionability_score: number;
    checks: DataHealthCheck[];
    /** Human-readable recommendations for improving data completeness. */
    recommendations: string[];
};

/**
 * Rule-based insight generated from KPI analysis.
 */
export type InsightItem = {
    id: string;
    category: "finance" | "demand" | "data" | "scenario";
    severity: "critical" | "warning" | "positive" | "info";
    text: string;
};

/**
 * Response from the rule-based insight engine.
 */
export type InsightsResponse = {
    baseline_week_id: number;
    insights: InsightItem[];
    rules_evaluated: number;
};

// ---------------------------------------------------------------------------
// Simulation types
// ---------------------------------------------------------------------------

/**
 * Four-point distributional summary for a single metric across N simulation runs.
 * Enables the frontend to display central tendency (mean/p50) and confidence
 * bands (p10–p90 range).
 */
export type MetricSummary = { mean: number; p10: number; p50: number; p90: number };

/**
 * Complete simulation result returned by the /simulation/run endpoint.
 * Contains the full distributional summary for every tracked metric.
 */
export type SimulationResponse = {
    baseline_week_id: number;
    week_start: string;
    /** The scenario overrides that were applied for this run. */
    overrides: any;
    result: {
        /** Number of Monte Carlo / DES replications executed. */
        runs: number;
        /** Map of metric keys to their {mean, p10, p50, p90} summaries. */
        metrics: Record<string, MetricSummary>;
        /** Transparency: stochastic assumptions used in the simulation. */
        assumptions?: Record<string, any>;
    };
};

/**
 * Simulation parameters — configurable triangular distribution parameters
 * and behavioural model settings stored per baseline week.
 */
export type SimulationParams = {
    id: number;
    baseline_week_id: number;
    /** Kitchen prep time distribution: Triangular(min, mode, max) in minutes. */
    prep_time_min: number;
    prep_time_mode: number;
    prep_time_max: number;
    /** Customer dining time distribution: Triangular(min, mode, max) in minutes. */
    seat_time_min: number;
    seat_time_mode: number;
    seat_time_max: number;
    /** Correlation coefficient: seat_time += alpha × food_wait. */
    alpha_seat_wait: number;
    /** Max wait for table before balking (0 = disabled). */
    balking_wait_table_limit: number;
    /** Max wait for food before balking (0 = disabled). */
    balking_wait_food_limit: number;
    /** Constant price elasticity of demand (typically negative, e.g., -1.2). */
    price_elasticity: number;
    /** Amplitude of uniform demand noise (0.2 = ±20%). */
    demand_noise_pct: number;
};

// ---------------------------------------------------------------------------
// Scenario & experiment types
// ---------------------------------------------------------------------------

/**
 * A single staffing change within a what-if scenario.
 */
export type StaffingChange = {
    weekday: number;
    daypart_id: number;
    role: string;
    /** Additive change: +1 = add one staff member, -1 = remove one. */
    delta_staff: number;
};

/**
 * Menu price change specification for a scenario.
 */
export type PriceChange = {
    /** "percent" = relative change (0.10 = +10%), "absolute" = CZK amount. */
    type: "percent" | "absolute";
    value: number;
};

/**
 * Capacity override for a scenario (e.g., adding outdoor seating).
 */
export type CapacityChanges = {
    tables_count: number;
    seats_total: number;
};

/**
 * Opening hours modification for a scenario (per weekday).
 */
export type OpeningHoursChange = {
    weekday: number;
    open_time: string;
    close_time: string;
};

/**
 * Complete set of what-if overrides that define a simulation scenario.
 * Each field modifies a specific aspect of the baseline configuration.
 */
export type SimulationOverrides = {
    staffing_changes: StaffingChange[];
    price_change?: PriceChange | null;
    capacity_changes?: CapacityChanges | null;
    opening_hours_changes: OpeningHoursChange[];
    /** Multiplicative factor for all arrival counts (1.0 = no change). */
    arrivals_multiplier: number;
    /** Multiplicative factor for all spend values (1.0 = no change). */
    spend_multiplier: number;
    /** Override for food cost percentage (null = use baseline). */
    food_cost_pct_override?: number | null;
    /** Override for fixed weekly cost (null = use baseline). */
    fixed_cost_week_override?: number | null;
};

/**
 * Request payload for the /simulation/run endpoint.
 */
export type SimulationRunRequest = {
    baseline_week_id: number;
    /** Number of Monte Carlo / DES replications. */
    runs: number;
    /** Random seed for reproducibility (null = random). */
    seed?: number | null;
    overrides: SimulationOverrides;
};

/**
 * A saved what-if scenario — a named set of overrides associated with a baseline week.
 * Scenarios can be re-run, compared, and exported.
 */
export type Scenario = {
    id: number;
    baseline_week_id: number;
    name: string;
    /** The full set of what-if overrides defining this scenario. */
    params: SimulationOverrides;
    /** ISO timestamp of when the scenario was created. */
    created_at: string;
};

/**
 * Deterministic delta comparison between baseline and scenario KPIs.
 * Computed without running the stochastic simulation — instant results.
 */
export type ScenarioKpisResponse = {
    scenario_id: number;
    scenario_name: string;
    baseline_week_id: number;
    /** KPI values computed from baseline demand data. */
    baseline_kpis: Record<string, number>;
    /** KPI values after applying scenario overrides deterministically. */
    scenario_kpis: Record<string, number>;
    /** Difference: scenario_kpis - baseline_kpis per metric. */
    deltas: Record<string, number>;
};

// ---------------------------------------------------------------------------
// AI types
// ---------------------------------------------------------------------------

/**
 * A single GPT-generated insight from the AI analysis endpoint.
 */
export type AiInsight = {
    category: string;
    severity: string;
    title: string;
    text: string;
    recommendation: string;
};

/**
 * Response from the /ai/insights endpoint (batch analysis).
 */
export type AiInsightsResponse = {
    insights: AiInsight[];
    model: string;
    tokens_used: number;
};

/**
 * A single message in the AI advisor chat conversation history.
 */
export type AiChatMessage = {
    role: "user" | "assistant";
    content: string;
};

/**
 * Response from the /ai/advisor endpoint (chat completion).
 */
export type AiAdvisorResponse = {
    reply: string;
    tokens_used: number;
};