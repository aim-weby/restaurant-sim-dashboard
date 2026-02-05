import { useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type MetricSummary = { mean: number; p10: number; p50: number; p90: number };

type SimulationResponse = {
    baseline_week_id: number;
    week_start: string;
    overrides: any;
    result: {
        runs: number;
        metrics: Record<string, MetricSummary>;
        assumptions: Record<string, any>;
    };
};

type Scenario = {
    key: string;
    name: string;
    overrides: any;
};

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}
function fmtPercent(v: number) {
    return `${(v * 100).toFixed(1)} %`;
}
function fmtValue(metric: string, v: number) {
    if (metric.startsWith("finance.") && !metric.endsWith("_ratio") && !metric.endsWith("_margin")) return fmtCurrency(v);
    if (metric.endsWith("_ratio") || metric.endsWith("_margin")) return fmtPercent(v);
    return v.toFixed(2);
}

function metric(result: SimulationResponse | null, key: string): MetricSummary | null {
    if (!result) return null;
    return result.result.metrics[key] ?? null;
}

export default function SimulationPage(props: { baselineWeekId: number | null }) {
    const [runs, setRuns] = useState(300);
    const [seed, setSeed] = useState<number | "">(42);
    const [arrivalsSigma, setArrivalsSigma] = useState(0.2);
    const [spendSigma, setSpendSigma] = useState(0.1);

    const [error, setError] = useState<string | null>(null);
    const [runningKey, setRunningKey] = useState<string | null>(null);

    const [results, setResults] = useState<Record<string, SimulationResponse>>({});

    // ---- default scenarios (weekday: 5=Sat; daypart_id: 2=Dinner) ----
    const scenarios: Scenario[] = useMemo(() => {
        return [
            {
                key: "baseline",
                name: "Baseline",
                overrides: {
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.0,
                    food_cost_pct_override: null,
                    fixed_cost_week_override: null,
                    staffing_delta: [],
                },
            },
            {
                key: "sat_dinner_plus1_kitchen",
                name: "+1 kitchen on Sat Dinner",
                overrides: {
                    arrivals_multiplier: 1.0,
                    spend_multiplier: 1.0,
                    food_cost_pct_override: null,
                    fixed_cost_week_override: null,
                    staffing_delta: [
                        { weekday: 5, daypart_id: 2, role: "kitchen", staff_count_delta: 1 },
                    ],
                },
            },
            {
                key: "price_plus5_demand_minus3",
                name: "Price +5%, Demand −3%",
                overrides: {
                    arrivals_multiplier: 0.97,
                    spend_multiplier: 1.05,
                    food_cost_pct_override: null,
                    fixed_cost_week_override: null,
                    staffing_delta: [],
                },
            },
        ];
    }, []);

    async function runScenario(s: Scenario) {
        if (!props.baselineWeekId) {
            setError("Select a baseline week first (Baseline weeks → Open grid).");
            return;
        }
        setRunningKey(s.key);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/simulation/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    baseline_week_id: props.baselineWeekId,
                    runs,
                    seed: seed === "" ? null : Number(seed),
                    arrivals_sigma: arrivalsSigma,
                    spend_sigma: spendSigma,
                    overrides: s.overrides,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text}`);
            }

            const json = (await res.json()) as SimulationResponse;
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

    const compareKeys = ["finance.profit", "finance.revenue", "demand.lost_groups"];

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1200 }}>
            <h1>Simulation – Scenario compare</h1>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
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

                <label style={{ display: "grid", gap: 6 }}>
                    Arrivals sigma (0–1)
                    <input
                        type="number"
                        step="0.05"
                        value={arrivalsSigma}
                        onChange={(e) => setArrivalsSigma(Number(e.target.value))}
                        min={0}
                        max={1}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    Spend sigma (0–1)
                    <input
                        type="number"
                        step="0.05"
                        value={spendSigma}
                        onChange={(e) => setSpendSigma(Number(e.target.value))}
                        min={0}
                        max={1}
                    />
                </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ color: "#666", fontSize: 12 }}>
                    Baseline week selected: <b>{props.baselineWeekId ?? "none"}</b>
                </div>
                <button onClick={clearResults}>Clear results</button>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {scenarios.map((s) => (
                    <div key={s.key} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
                            {s.key}
                        </div>
                        <button
                            style={{ marginTop: 10 }}
                            onClick={() => runScenario(s)}
                            disabled={runningKey !== null}
                        >
                            {runningKey === s.key ? "Running…" : "Run"}
                        </button>

                        {results[s.key] && (
                            <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                                Done · runs: {results[s.key].result.runs}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Compare table */}
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
                                <td><code>{m}</code></td>
                                {scenarios.map((s) => {
                                    const r = metric(results[s.key] ?? null, m);
                                    if (!r) return <td key={s.key} style={{ color: "#999" }}>—</td>;
                                    return (
                                        <td key={s.key}>
                                            <div><b>{fmtValue(m, r.p50)}</b></div>
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