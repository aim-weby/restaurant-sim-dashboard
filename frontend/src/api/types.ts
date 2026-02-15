export type Daypart = {
    id: number;
    label: string;
    start_time: string;
    end_time: string;
    sort_order: number;
};

export type BaselineWeek = {
    id: number;
    week_start: string;
    label: string;
};

export type BaselineCell = {
    id?: number;
    baseline_week_id?: number;
    weekday: number;
    daypart_id: number;
    arrivals_groups: number;
    avg_spend_per_group: number;
    avg_party_size: number;
};

export type Costs = {
    id: number;
    fixed_cost_week: number;
    food_cost_pct: number;
};

export type StaffingRow = {
    id?: number;
    weekday: number;
    daypart_id: number;
    role: string;
    staff_count: number;
    hourly_rate: number;
    hours_in_daypart: number;
};

export type KpisResponse = {
    baseline_week_id: number;
    currency?: string;
    kpis: Record<string, number>;
    timeseries?: {
        by_weekday: Record<string, number | string>[];
        by_daypart: Record<string, number | string>[];
        heatmap: Record<string, number>[];
    };
    inputs_used?: Record<string, any>;
};

export type DataHealthCheck = {
    key: string;
    label: string;
    status: "ok" | "missing";
    detail?: string;
};

export type DataHealthResponse = {
    baseline_week_id: number;
    coverage_score: number;
    actionability_score: number;
    checks: DataHealthCheck[];
    recommendations: string[];
};

export type InsightItem = {
    id: string;
    category: "finance" | "demand" | "data" | "scenario";
    severity: "critical" | "warning" | "positive" | "info";
    text: string;
};

export type InsightsResponse = {
    baseline_week_id: number;
    insights: InsightItem[];
    rules_evaluated: number;
};

export type MetricSummary = { mean: number; p10: number; p50: number; p90: number };

export type SimulationResponse = {
    baseline_week_id: number;
    week_start: string;
    overrides: any;
    result: {
        runs: number;
        metrics: Record<string, MetricSummary>;
        assumptions: Record<string, any>;
    };
};

export type StaffingChange = {
    weekday: number;
    daypart_id: number;
    role: string;
    delta_staff: number;
};

export type PriceChange = {
    type: "percent" | "absolute";
    value: number;
};

export type CapacityChanges = {
    tables_count: number;
    seats_total: number;
};

export type OpeningHoursChange = {
    weekday: number;
    open_time: string;
    close_time: string;
};

export type SimulationOverrides = {
    staffing_changes: StaffingChange[];
    price_change?: PriceChange | null;
    capacity_changes?: CapacityChanges | null;
    opening_hours_changes: OpeningHoursChange[];
    arrivals_multiplier: number;
    spend_multiplier: number;
    food_cost_pct_override?: number | null;
    fixed_cost_week_override?: number | null;
};

export type SimulationRunRequest = {
    baseline_week_id: number;
    runs: number;
    seed?: number | null;
    overrides: SimulationOverrides;
};

export type Scenario = {
    id: number;
    baseline_week_id: number;
    name: string;
    params: SimulationOverrides;
    created_at: string;
};

export type ScenarioKpisResponse = {
    scenario_id: number;
    scenario_name: string;
    baseline_week_id: number;
    baseline_kpis: Record<string, number>;
    scenario_kpis: Record<string, number>;
    deltas: Record<string, number>;
};

export type Venue = {
    id: number;
    name: string;
    timezone: string;
    currency: string;
    seats_total: number;
    tables_count: number;
    mode: string;
};

export type SimulationParams = {
    id: number;
    baseline_week_id: number;
    prep_time_min: number;
    prep_time_mode: number;
    prep_time_max: number;
    seat_time_min: number;
    seat_time_mode: number;
    seat_time_max: number;
    alpha_seat_wait: number;
    balking_wait_table_limit: number;
    balking_wait_food_limit: number;
    price_elasticity: number;
    demand_noise_pct: number;
};

export type ExperimentDelta = {
    baseline: number;
    scenario: number;
    delta: number;
    delta_pct: number;
};

export type ExperimentResult = {
    id: string;
    name: string;
    description: string;
    overrides: SimulationOverrides;
    summary: Record<string, MetricSummary>;
    deltas: Record<string, ExperimentDelta> | null;
};

export type ExperimentsResponse = {
    baseline_week_id: number;
    week_start: string;
    runs_per_experiment: number;
    seed: number;
    experiment_count: number;
    experiments: ExperimentResult[];
};

export type OpeningHoursItem = {
    id?: number;
    weekday: number;
    weekday_label?: string;
    open_time: string;
    close_time: string;
    is_closed: boolean;
};

// ---- AI types ----
export type AiInsight = {
    category: string;
    severity: string;
    title: string;
    text: string;
    recommendation: string;
};

export type AiInsightsResponse = {
    insights: AiInsight[];
    model: string;
    tokens_used: number;
};

export type AiChatMessage = {
    role: "user" | "assistant";
    content: string;
};

export type AiAdvisorResponse = {
    reply: string;
    tokens_used: number;
};