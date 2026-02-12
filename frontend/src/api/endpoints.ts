import { fetchJson } from "./client";
import type {
    BaselineCell,
    BaselineWeek,
    Costs,
    DataHealthResponse,
    Daypart,
    ExperimentsResponse,
    InsightsResponse,
    KpisResponse,
    OpeningHoursItem,
    Scenario,
    ScenarioKpisResponse,
    SimulationParams,
    SimulationResponse,
    SimulationRunRequest,
    StaffingRow,
    Venue,
} from "./types";

export const api = {
    // --- dayparts ---
    listDayparts: () => fetchJson<Daypart[]>("/dayparts"),
    createDaypart: (payload: { label: string; start_time: string; end_time: string; sort_order: number }) =>
        fetchJson<Daypart>("/dayparts", { method: "POST", body: JSON.stringify(payload) }),
    updateDaypart: (id: number, payload: { label: string; start_time: string; end_time: string; sort_order: number }) =>
        fetchJson<Daypart>(`/dayparts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    deleteDaypart: (id: number) =>
        fetchJson<void>(`/dayparts/${id}`, { method: "DELETE" }),

    // --- baseline weeks ---
    listWeeks: () => fetchJson<BaselineWeek[]>("/baseline-weeks"),
    createWeek: (payload: { week_start: string; label: string }) =>
        fetchJson<BaselineWeek>("/baseline-weeks", { method: "POST", body: JSON.stringify(payload) }),

    // --- baseline data ---
    getBaselineData: (weekId: number) => fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`),
    putBaselineData: (weekId: number, cells: BaselineCell[]) =>
        fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`, { method: "PUT", body: JSON.stringify(cells) }),

    // --- KPI (single canonical method) ---
    getKpis: (weekId: number) => fetchJson<KpisResponse>(`/baseline-weeks/${weekId}/kpis`),
    getHealth: (weekId: number) => fetchJson<DataHealthResponse>(`/baseline-weeks/${weekId}/health`),

    // --- costs ---
    getCosts: () => fetchJson<Costs>("/settings/costs"),
    updateCosts: (payload: { fixed_cost_week: number; food_cost_pct: number }) =>
        fetchJson<Costs>("/settings/costs", { method: "PUT", body: JSON.stringify(payload) }),

    // --- staffing ---
    listStaffing: () => fetchJson<StaffingRow[]>("/staffing"),
    upsertStaffing: (rows: StaffingRow[]) =>
        fetchJson<StaffingRow[]>("/staffing", { method: "PUT", body: JSON.stringify(rows) }),

    // --- insights ---
    getInsights: (weekId: number) => fetchJson<InsightsResponse>(`/baseline-weeks/${weekId}/insights`),

    // --- simulation ---
    runSimulation: (payload: SimulationRunRequest) =>
        fetchJson<SimulationResponse>("/simulation/run", { method: "POST", body: JSON.stringify(payload) }),

    // --- scenarios ---
    listScenarios: (weekId: number) => fetchJson<Scenario[]>(`/baseline-weeks/${weekId}/scenarios`),
    createScenario: (weekId: number, payload: { name: string; params: any }) =>
        fetchJson<Scenario>(`/baseline-weeks/${weekId}/scenarios`, { method: "POST", body: JSON.stringify(payload) }),
    runScenario: (scenarioId: number, payload: { runs: number; seed?: number | null }) =>
        fetchJson<SimulationResponse>(`/scenarios/${scenarioId}/run`, { method: "POST", body: JSON.stringify(payload) }),
    getScenarioKpis: (scenarioId: number) =>
        fetchJson<ScenarioKpisResponse>(`/scenarios/${scenarioId}/kpis`),

    // --- venue ---
    getVenue: () => fetchJson<Venue>("/venue"),
    updateVenue: (payload: {
        name: string;
        timezone: string;
        currency: string;
        seats_total: number;
        tables_count: number;
        mode: string;
    }) => fetchJson<Venue>("/venue", { method: "PUT", body: JSON.stringify(payload) }),

    // --- simulation params ---
    getSimParams: (weekId: number) => fetchJson<SimulationParams>(`/baseline-weeks/${weekId}/sim-params`),
    updateSimParams: (weekId: number, payload: Omit<SimulationParams, "id" | "baseline_week_id">) =>
        fetchJson<SimulationParams>(`/baseline-weeks/${weekId}/sim-params`, { method: "PUT", body: JSON.stringify(payload) }),

    // --- experiments ---
    runExperiments: (weekId: number, runs = 200, seed = 42) =>
        fetchJson<ExperimentsResponse>(`/experiments/run?baseline_week_id=${weekId}&runs=${runs}&seed=${seed}`, { method: "POST" }),

    // --- opening hours ---
    getOpeningHours: () => fetchJson<OpeningHoursItem[]>("/opening-hours"),
    updateOpeningHours: (items: OpeningHoursItem[]) =>
        fetchJson<OpeningHoursItem[]>("/opening-hours", { method: "PUT", body: JSON.stringify(items) }),

    // --- seed ---
    seedDemo: () => fetchJson<{ status: string; detail: string; baseline_week_id?: number }>("/seed/demo", { method: "POST" }),
};