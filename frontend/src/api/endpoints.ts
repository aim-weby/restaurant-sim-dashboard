import { fetchJson } from "./client";
import type {
    BaselineCell,
    BaselineWeek,
    Costs,
    Daypart,
    KpisResponse,
    Scenario,
    SimulationResponse,
    SimulationRunRequest,
    StaffingRow,
} from "./types";

// --- dayparts ---
export const api = {
    listDayparts: () => fetchJson<Daypart[]>("/dayparts"),

    // --- baseline weeks ---
    listWeeks: () => fetchJson<BaselineWeek[]>("/baseline-weeks"),
    createWeek: (payload: { week_start: string; label: string }) =>
        fetchJson<BaselineWeek>("/baseline-weeks", { method: "POST", body: JSON.stringify(payload) }),

    // --- baseline data ---
    getBaselineData: (weekId: number) => fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`),
    putBaselineData: (weekId: number, cells: BaselineCell[]) =>
        fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`, { method: "PUT", body: JSON.stringify(cells) }),

    // --- KPI ---
    getKpis: (weekId: number) => fetchJson<KpisResponse>(`/baseline-weeks/${weekId}/kpis`),

    // --- costs ---
    getCosts: () => fetchJson<Costs>("/settings/costs"),
    updateCosts: (payload: { fixed_cost_week: number; food_cost_pct: number }) =>
        fetchJson<Costs>("/settings/costs", { method: "PUT", body: JSON.stringify(payload) }),

    // --- staffing ---
    listStaffing: () => fetchJson<StaffingRow[]>("/staffing"),
    upsertStaffing: (rows: StaffingRow[]) =>
        fetchJson<StaffingRow[]>("/staffing", { method: "PUT", body: JSON.stringify(rows) }),

    // --- simulation ---
    runSimulation: (payload: SimulationRunRequest) =>
        fetchJson<SimulationResponse>("/simulation/run", { method: "POST", body: JSON.stringify(payload) }),

    // --- scenarios (storage) -> doplníme v kroku 3 backend ---
    listScenarios: (weekId: number) => fetchJson<Scenario[]>(`/baseline-weeks/${weekId}/scenarios`),
    createScenario: (weekId: number, payload: { name: string; params: any }) =>
        fetchJson<Scenario>(`/baseline-weeks/${weekId}/scenarios`, { method: "POST", body: JSON.stringify(payload) }),
    runScenario: (scenarioId: number, payload: { runs: number; seed?: number | null; arrivals_sigma: number; spend_sigma: number }) =>
        fetchJson<SimulationResponse>(`/scenarios/${scenarioId}/run`, { method: "POST", body: JSON.stringify(payload) }),
};