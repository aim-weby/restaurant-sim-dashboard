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
    kpis: Record<string, number>;
    inputs_used?: Record<string, number>;
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

export type StaffingDelta = {
    weekday: number;
    daypart_id: number;
    role: string;
    staff_count_delta: number;
};

export type SimulationOverrides = {
    arrivals_multiplier: number;
    spend_multiplier: number;
    food_cost_pct_override?: number | null;
    fixed_cost_week_override?: number | null;
    staffing_delta: StaffingDelta[];
};

export type SimulationRunRequest = {
    baseline_week_id: number;
    runs: number;
    seed?: number | null;
    arrivals_sigma: number;
    spend_sigma: number;
    overrides: SimulationOverrides;
};

export type Scenario = {
    id: number;
    baseline_week_id: number;
    name: string;
    params: SimulationOverrides;
    created_at: string;
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

export type BaselineKpisResponse = {
    baseline_week_id: number;
    kpis: Record<string, number>;
    inputs_used: Record<string, any>;
};

export type BaselineGridCell = {
    id: number;
    baseline_week_id: number;
    weekday: number; // 0..6
    daypart_id: number;
    arrivals_groups: number;
    avg_spend: number;
    avg_party_size: number;
};