import { useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type MetricSummary = { mean: number; p10: number; p50: number; p90: number };

type SimulationResponse = {
    baseline_week_id: number;
    week_start: string;
    result: {
        runs: number;
        metrics: Record<string, MetricSummary>;
        assumptions: Record<string, any>;
    };
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

export default function SimulationPage(props: { baselineWeekId: number | null }) {
    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState<number | "">("");
    const [arrivalsSigma, setArrivalsSigma] = useState(0.2);
    const [spendSigma, setSpendSigma] = useState(0.1);

    const [data, setData] = useState<SimulationResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function run() {
        if (!props.baselineWeekId) {
            setError("Select a baseline week first (Baseline weeks → Open grid).");
            return;
        }
        setLoading(true);
        setError(null);
        setData(null);
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
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData((await res.json()) as SimulationResponse);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    const shownKeys = useMemo(() => {
        if (!data) return [];
        const keys = Object.keys(data.result.metrics);
        const preferred = [
            "finance.revenue",
            "finance.cogs",
            "finance.labor_cost",
            "finance.fixed_cost",
            "finance.profit",
            "demand.lost_groups",
        ];
        return preferred.filter((k) => keys.includes(k));
    }, [data]);

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100 }}>
            <h1>Simulation (Monte Carlo MVP)</h1>

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
                <button onClick={run} disabled={loading}>
                    {loading ? "Running…" : "Run simulation"}
                </button>
                <div style={{ color: "#666", fontSize: 12 }}>
                    Baseline week selected: {props.baselineWeekId ?? "none"}
                </div>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            {data && (
                <>
                    <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                        <b>Result</b>
                        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
                            Week start: {data.week_start} · Runs: {data.result.runs}
                        </div>

                        <div style={{ overflowX: "auto", marginTop: 12 }}>
                            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                                <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                                    <th>Metric</th>
                                    <th>p10</th>
                                    <th>p50</th>
                                    <th>p90</th>
                                    <th>mean</th>
                                </tr>
                                </thead>
                                <tbody>
                                {shownKeys.map((k) => {
                                    const s = data.result.metrics[k];
                                    return (
                                        <tr key={k} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                            <td><code>{k}</code></td>
                                            <td>{fmtValue(k, s.p10)}</td>
                                            <td><b>{fmtValue(k, s.p50)}</b></td>
                                            <td>{fmtValue(k, s.p90)}</td>
                                            <td>{fmtValue(k, s.mean)}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <details style={{ marginTop: 12 }}>
                        <summary>Assumptions</summary>
                        <pre style={{ background: "#fafafa", padding: 12, borderRadius: 10, overflowX: "auto" }}>
              {JSON.stringify(data.result.assumptions, null, 2)}
            </pre>
                    </details>
                </>
            )}
        </div>
    );
}