/**
 * @fileoverview Custom React hook for persistent simulation default values.
 *
 * This hook centralises the `runs` (number of Monte Carlo replications) and
 * `seed` (random seed for reproducibility) state management that is shared
 * across all simulation-related pages: DashboardPage, SimulationPage,
 * ScenariosPage, ReportPage, and ExperimentsPage.
 *
 * Values are persisted to `localStorage` so that the user's preferred
 * simulation settings survive page refreshes and navigation.
 *
 * Architecture note:
 *   This hook was introduced in V3 of the code audit to eliminate duplicated
 *   `useState(1000)` / `useState(42)` declarations across 5 page components,
 *   following the DRY principle and ensuring consistent defaults.
 *
 * @module hooks/useSimDefaults
 */

import { useState, useEffect } from "react";

/**
 * Provides localStorage-backed state for simulation runs and seed.
 *
 * On initial render, reads saved values from localStorage. On every state
 * change, persists the new value. This ensures that when the user navigates
 * from DashboardPage to SimulationPage, their chosen runs/seed carry over.
 *
 * @returns An object with `runs`, `setRuns`, `seed`, and `setSeed`.
 *   - `runs` (number): Number of simulation replications (default: 1000).
 *   - `seed` (number | ""): Random seed for reproducibility. Empty string
 *     signifies "no seed" (random), converting to `null` in API calls.
 *
 * @example
 * ```tsx
 * const { runs, setRuns, seed, setSeed } = useSimDefaults();
 * // runs defaults to 1000, seed defaults to 42 on first use
 * ```
 */
export function useSimDefaults() {
    // Initialise `runs` from localStorage, falling back to 1000 (sensible default
    // for a balance between statistical accuracy and computation time)
    const [runs, setRunsState] = useState(() => {
        const saved = localStorage.getItem("sim_runs");
        return saved ? Number(saved) : 1000;
    });

    // Initialise `seed` from localStorage, falling back to 42 (a common
    // convention for default seeds, ensuring reproducible demo results)
    const [seed, setSeedState] = useState<number | "">(() => {
        const saved = localStorage.getItem("sim_seed");
        if (saved === "") return "";
        return saved ? Number(saved) : 42;
    });

    // Persist `runs` to localStorage on every change
    useEffect(() => { localStorage.setItem("sim_runs", String(runs)); }, [runs]);
    // Persist `seed` to localStorage on every change
    useEffect(() => { localStorage.setItem("sim_seed", String(seed)); }, [seed]);

    return { runs, setRuns: setRunsState, seed, setSeed: setSeedState } as const;
}
