import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { SimulationResponse } from "../api/types";

type MetricSummary = { mean: number; p10: number; p50: number; p90: number; median: number };

type Scenario = {
    key: string;
    name: string;
    overrides: any;
};

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v: number) {
    return v.toFixed(1);
}
function fmtValue(metric: string, v: number) {
    if (metric.startsWith("finance.")) return fmtCurrency(v);
    if (metric.startsWith("util.")) return `${(v * 100).toFixed(1)} %`;
    if (metric.startsWith("queue.") || metric.startsWith("time.")) return `${fmtNum(v)} min`;
    return fmtNum(v);
}

function metric(result: SimulationResponse | null, key: string): MetricSummary | null {
    if (!result) return null;
    return (result.result.metrics[key] as MetricSummary) ?? null;
}

export default function SimulationPage() {
    const [sp] = useSearchParams();
    const baselineWeekId = sp.get("weekId") ? Number(sp.get("weekId")) : null;

    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState<number | "">(42);

    const [error, setError] = useState<string | null>(null);
    const [runningKey, setRunningKey] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, SimulationResponse>>({});

    const scenarios: Scenario[] = useMemo(() => {
        return [
            {
                key: "baseline",
                name: "Baseline",
                overrides: {
                    staffing_changes: [],
                    price_change: null,
                    capacity_changes: null,
                    opening_hours_changes: [],
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.0,
                },
            },
            {
                key: "sat_dinner_plus1_kitchen",
                name: "+1 kitchen on Sat Dinner",
                overrides: {
                    staffing_changes: [{ weekday: 5, daypart_id: 2, role: "kitchen", delta_staff: 1 }],
                    price_change: null,
                    capacity_changes: null,
                    opening_hours_changes: [],
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.0,
                },
            },
            {
                key: "price_plus8",
                name: "Price +8% (elasticity)",
                overrides: {
                    staffing_changes: [],
                    price_change: { type: "percent", value: 0.08 },
                    capacity_changes: null,
                    opening_hours_changes: [],
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.05,
                },
            },
            {
                key: "add_tables",
                name: "+4 seats capacity",
                overrides: {
                    staffing_changes: [],
                    price_change: null,
                    capacity_changes: { tables_count: 1, seats_total: 4 },
                    opening_hours_changes: [],
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.0,
                },
            },
        ];
    }, []);

    async function runScenario(s: Scenario) {
        if (!baselineWeekId || Number.isNaN(baselineWeekId)) {
            setError("Missing weekId. Open simulation from a week (Weeks → Simulate) or use /simulation?weekId=1.");
            return;
        }

        setRunningKey(s.key);
        setError(null);

        try {
            const json = await api.runSimulation({
                baseline_week_id: baselineWeekId,
                runs,
                seed: seed === "" ? null : Number(seed),
                overrides: s.overrides,
            });

            setResults((prev) => ({ ...prev, [s.key]: json }));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunningKey(null);
        }
    }

    function clearResults() {
        setResults({});
    }

    const compareKeys = [
        "finance.revenue", "finance.profit", "demand.served_groups", "demand.lost_groups",
        "queue.wait_table", "queue.wait_food", "util.kitchen", "util.tables",
    ];

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1200 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
                {baselineWeekId && !Number.isNaN(baselineWeekId) && (
                    <>
                        <Link to={`/baseline-weeks/${baselineWeekId}/grid`}>Grid</Link>
                        <Link to={`/baseline-weeks/${baselineWeekId}/kpis`}>KPI</Link>
                        <Link to={`/baseline-weeks/${baselineWeekId}/scenarios`}>Scenarios</Link>
                        <Link to={`/baseline-weeks/${baselineWeekId}/sim-params`}>Sim Params</Link>
                    </>
                )}
            </div>

            <h1>Simulation – Scenario compare</h1>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, maxWidth: 400 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    Runs
                    <input type="number" value={runs} onChange={(e) => setRuns(Number(e.target.value))} min={10} max={5000} />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    Seed (optional)
                    <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="e.g. 42"
                    />
                </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ color: "#666", fontSize: 12 }}>
                    Baseline week: <b>{baselineWeekId ?? "none"}</b>
                </div>
                <button onClick={clearResults}>Clear results</button>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {scenarios.map((s) => (
                    <div key={s.key} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{s.key}</div>

                        <button style={{ marginTop: 10 }} onClick={() => runScenario(s)} disabled={runningKey !== null}>
                            {runningKey === s.key ? "Running…" : "Run"}
                        </button>

                        {results[s.key] && (
                            <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                                ✓ runs: {results[s.key].result.runs}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Compare</h3>

                <div style={{ overflowX: "auto" }}>
                    <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                                <th>Metric</th>
                                {scenarios.map((s) => (
                                    <th key={s.key}>{s.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {compareKeys.map((m) => (
                                <tr key={m} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                    <td>
                                        <code>{m}</code>
                                    </td>
                                    {scenarios.map((s) => {
                                        const r = metric(results[s.key] ?? null, m);
                                        if (!r) return <td key={s.key} style={{ color: "#999" }}>—</td>;
                                        return (
                                            <td key={s.key}>
                                                <div><b>{fmtValue(m, r.mean)}</b></div>
                                                <div style={{ color: "#666", fontSize: 12 }}>
                                                    p10–p90: {fmtValue(m, r.p10)} → {fmtValue(m, r.p90)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <details style={{ marginTop: 12 }}>
                    <summary>Raw JSON (latest runs)</summary>
                    <pre style={{ background: "#fafafa", padding: 12, borderRadius: 10, overflowX: "auto" }}>
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    );
}