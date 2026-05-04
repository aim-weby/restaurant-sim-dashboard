/**
 * @fileoverview API endpoint functions — typed wrappers around the REST API.
 *
 * This module exposes the `api` object, which is the **primary interface**
 * between the React frontend and the FastAPI backend. Each method corresponds
 * to exactly one backend endpoint, providing full TypeScript type safety for
 * both request payloads and response bodies.
 *
 * All methods delegate to {@link fetchJson} from `client.ts` for consistent
 * HTTP handling, error formatting, and JSON parsing.
 *
 * Organisation follows the same domain grouping as the backend routers:
 * dayparts → weeks → data → KPIs → costs → staffing → simulation → scenarios
 * → venue → params → opening hours → seed → AI.
 *
 * @module api/endpoints
 */

import { fetchJson } from "./client";
import type {
    BaselineCell,
    BaselineWeek,
    Costs,
    DataHealthResponse,
    Daypart,
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

/**
 * Centralised API client object.
 *
 * Provides typed async methods for every backend endpoint. Usage example:
 * ```ts
 * const weeks = await api.listWeeks();
 * const kpis = await api.getKpis(weeks[0].id);
 * ```
 */
export const api = {
    // ── Dayparts ────────────────────────────────────────────────────────
    /** Fetch all configured daypart time slots, ordered by sort_order. */
    listDayparts: () => fetchJson<Daypart[]>("/dayparts"),
    /** Create a new daypart. Backend validates for time overlap with existing dayparts. */
    createDaypart: (payload: { label: string; start_time: string; end_time: string; sort_order: number }) =>
        fetchJson<Daypart>("/dayparts", { method: "POST", body: JSON.stringify(payload) }),
    /** Update an existing daypart. Backend validates for time overlap (excluding self). */
    updateDaypart: (id: number, payload: { label: string; start_time: string; end_time: string; sort_order: number }) =>
        fetchJson<Daypart>(`/dayparts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    /** Delete a daypart. Warning: may orphan baseline data cells referencing this daypart. */
    deleteDaypart: (id: number) =>
        fetchJson<void>(`/dayparts/${id}`, { method: "DELETE" }),

    // ── Baseline weeks ─────────────────────────────────────────────────
    /** List all baseline weeks, ordered by ID descending (newest first). */
    listWeeks: () => fetchJson<BaselineWeek[]>("/baseline-weeks"),
    /** Create a new blank baseline week with a label and start date. */
    createWeek: (payload: { week_start: string; label: string }) =>
        fetchJson<BaselineWeek>("/baseline-weeks", { method: "POST", body: JSON.stringify(payload) }),
    /** Delete a baseline week and all associated data (cascade). */
    deleteWeek: (weekId: number) =>
        fetchJson<void>(`/baseline-weeks/${weekId}`, { method: "DELETE" }),

    // ── Baseline data (demand matrix) ──────────────────────────────────
    /** Fetch all demand cells for a given baseline week. */
    getBaselineData: (weekId: number) => fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`),
    /** Upsert (create or update) demand cells for a baseline week. */
    putBaselineData: (weekId: number, cells: BaselineCell[]) =>
        fetchJson<BaselineCell[]>(`/baseline-weeks/${weekId}/data`, { method: "PUT", body: JSON.stringify(cells) }),

    // ── KPIs & data health ─────────────────────────────────────────────
    /** Compute aggregated KPIs (revenue, profit, margins, timeseries) for a week. */
    getKpis: (weekId: number) => fetchJson<KpisResponse>(`/baseline-weeks/${weekId}/kpis`),
    /** Assess data completeness and quality for a baseline week. */
    getHealth: (weekId: number) => fetchJson<DataHealthResponse>(`/baseline-weeks/${weekId}/health`),

    // ── Cost settings ──────────────────────────────────────────────────
    /** Fetch the global cost configuration (fixed costs, food cost %). */
    getCosts: () => fetchJson<Costs>("/settings/costs"),
    /** Update the global cost configuration. */
    updateCosts: (payload: { fixed_cost_week: number; food_cost_pct: number }) =>
        fetchJson<Costs>("/settings/costs", { method: "PUT", body: JSON.stringify(payload) }),

    // ── Staffing plan ──────────────────────────────────────────────────
    /** Fetch all staffing plan entries (all weekdays × dayparts × roles). */
    listStaffing: () => fetchJson<StaffingRow[]>("/staffing"),
    /** Upsert staffing plan entries (creates missing, updates existing). */
    upsertStaffing: (rows: StaffingRow[]) =>
        fetchJson<StaffingRow[]>("/staffing", { method: "PUT", body: JSON.stringify(rows) }),

    // ── Rule-based insights ────────────────────────────────────────────
    /** Generate rule-based business insights for a baseline week's KPIs. */
    getInsights: (weekId: number) => fetchJson<InsightsResponse>(`/baseline-weeks/${weekId}/insights`),

    // ── Simulation (DES / Monte Carlo) ─────────────────────────────────
    /**
     * Execute a simulation run with the given overrides.
     * Returns distributional summaries (mean, p10, p50, p90) for all metrics.
     */
    runSimulation: (payload: SimulationRunRequest) =>
        fetchJson<SimulationResponse>("/simulation/run", { method: "POST", body: JSON.stringify(payload) }),

    // ── Scenarios (saved what-if configurations) ───────────────────────
    /** List all saved scenarios for a baseline week. */
    listScenarios: (weekId: number) => fetchJson<Scenario[]>(`/baseline-weeks/${weekId}/scenarios`),
    /** Create and save a new named scenario with the given overrides. */
    createScenario: (weekId: number, payload: { name: string; params: any }) =>
        fetchJson<Scenario>(`/baseline-weeks/${weekId}/scenarios`, { method: "POST", body: JSON.stringify(payload) }),
    /** Run a saved scenario through the simulation engine. */
    runScenario: (scenarioId: number, payload: { runs: number; seed?: number | null }) =>
        fetchJson<SimulationResponse>(`/scenarios/${scenarioId}/run`, { method: "POST", body: JSON.stringify(payload) }),
    /** Compute deterministic KPI deltas for a scenario (instant, no simulation). */
    getScenarioKpis: (scenarioId: number) =>
        fetchJson<ScenarioKpisResponse>(`/scenarios/${scenarioId}/kpis`),
    /** Permanently delete a saved scenario. */
    deleteScenario: (scenarioId: number) =>
        fetchJson<void>(`/scenarios/${scenarioId}`, { method: "DELETE" }),

    // ── Venue settings ─────────────────────────────────────────────────
    /** Fetch the restaurant's global configuration (name, seats, currency, etc.). */
    getVenue: () => fetchJson<Venue>("/venue"),
    /** Update venue settings. seats_total is the DES table capacity binding constraint. */
    updateVenue: (payload: {
        name: string;
        timezone: string;
        currency: string;
        seats_total: number;
        tables_count: number;
        mode: string;
    }) => fetchJson<Venue>("/venue", { method: "PUT", body: JSON.stringify(payload) }),

    // ── Simulation parameters (per-week) ───────────────────────────────
    /** Fetch triangular distribution and behavioural parameters for a week. */
    getSimParams: (weekId: number) => fetchJson<SimulationParams>(`/baseline-weeks/${weekId}/sim-params`),
    /** Update simulation parameters. Frontend validates min ≤ mode ≤ max before calling. */
    updateSimParams: (weekId: number, payload: Omit<SimulationParams, "id" | "baseline_week_id">) =>
        fetchJson<SimulationParams>(`/baseline-weeks/${weekId}/sim-params`, { method: "PUT", body: JSON.stringify(payload) }),

    // ── Opening hours ──────────────────────────────────────────────────
    /** Fetch opening hours for all 7 weekdays. */
    getOpeningHours: () => fetchJson<OpeningHoursItem[]>("/opening-hours"),
    /** Update opening hours. Frontend validates close > open before calling. */
    updateOpeningHours: (items: OpeningHoursItem[]) =>
        fetchJson<OpeningHoursItem[]>("/opening-hours", { method: "PUT", body: JSON.stringify(items) }),

    // ── Seed / demo data ───────────────────────────────────────────────
    /** Populate the database with a Czech restaurant demo dataset. */
    seedDemo: () => fetchJson<{ status: string; detail: string; baseline_week_id?: number }>("/seed/demo", { method: "POST" }),
    /** Teardown existing data and seed a complete presentation dataset (factory reset). */
    seedPresentation: () => fetchJson<{ status: string }>("/seed/presentation", { method: "POST" }),

    // ── AI (GPT-powered) ───────────────────────────────────────────────
    /** Request AI-generated business insights for a baseline week's data. */
    getAiInsights: (weekId: number) =>
        fetchJson<import("./types").AiInsightsResponse>("/ai/insights", {
            method: "POST",
            body: JSON.stringify({ baseline_week_id: weekId }),
        }),
    /** Send a chat message to the AI business advisor. History is sliding-window limited. */
    askAdvisor: (messages: import("./types").AiChatMessage[], weekId?: number) =>
        fetchJson<import("./types").AiAdvisorResponse>("/ai/advisor", {
            method: "POST",
            body: JSON.stringify({ messages, baseline_week_id: weekId ?? null }),
        }),
};