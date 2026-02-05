import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/endpoints";
import type { Scenario, SimulationOverrides, SimulationResponse } from "../api/types";

function defaultOverrides(): SimulationOverrides {
    return {
        arrivals_multiplier: 1.0,
        spend_multiplier: 1.0,
        food_cost_pct_override: null,
        fixed_cost_week_override: null,
        staffing_delta: [],
    };
}

export default function ScenariosPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    const [items, setItems] = useState<Scenario[]>([]);
    const [name, setName] = useState("New scenario");
    const [overridesJson, setOverridesJson] = useState(JSON.stringify(defaultOverrides(), null, 2));

    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState<number | null>(null);

    const [results, setResults] = useState<Record<number, SimulationResponse>>({});

    async function load() {
        setError(null);
        try {
            const data = await api.listScenarios(week);
            setItems(data);
        } catch (e) {
            setError(String(e));
        }
    }

    useEffect(() => {
        if (!Number.isFinite(week)) return;
        load();
    }, [week]);

    async function create() {
        setError(null);
        try {
            const params = JSON.parse(overridesJson);
            await api.createScenario(week, { name, params });
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    async function runScenario(id: number) {
        setRunning(id);
        setError(null);
        try {
            const res = await api.runScenario(id, { runs: 300, seed: 42, arrivals_sigma: 0.2, spend_sigma: 0.1 });
            setResults((prev) => ({ ...prev, [id]: res }));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(null);
        }
    }

    const compareRows = useMemo(() => {
        const keys = ["finance.profit", "finance.revenue", "demand.lost_groups"];
        return keys;
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <h1>Saved scenarios (week #{week})</h1>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/baseline-weeks/${week}/grid`}>Open grid</Link>
                <Link to={`/baseline-weeks/${week}/kpis`}>View KPI</Link>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Create scenario</h3>
                <label style={{ display: "block", marginTop: 8 }}>
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </label>

                <label style={{ display: "block", marginTop: 10 }}>
                    Overrides JSON
                    <textarea
                        value={overridesJson}
                        onChange={(e) => setOverridesJson(e.target.value)}
                        rows={10}
                        style={{ width: "100%", padding: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                    />
                </label>

                <button onClick={create} style={{ marginTop: 10 }}>Save scenario</button>
            </div>

            <div style={{ marginTop: 18 }}>
                <h3>Scenario list</h3>

                {items.length === 0 ? (
                    <p>No scenarios yet.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {items.map((s) => (
                            <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontWeight: 700 }}>{s.name}</div>
                                <div style={{ color: "#666", fontSize: 12 }}>id: {s.id} · {s.created_at}</div>

                                <button onClick={() => runScenario(s.id)} disabled={running !== null} style={{ marginTop: 10 }}>
                                    {running === s.id ? "Running…" : "Run"}
                                </button>

                                {results[s.id] && (
                                    <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                                        Done · runs: {results[s.id].result.runs}
                                    </div>
                                )}

                                <details style={{ marginTop: 10 }}>
                                    <summary>Overrides</summary>
                                    <pre style={{ background: "#fafafa", padding: 10, borderRadius: 10, overflowX: "auto" }}>
                    {JSON.stringify(s.params, null, 2)}
                  </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Compare (run results)</h3>
                <div style={{ overflowX: "auto" }}>
                    <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                            <th>Metric</th>
                            {items.map((s) => (
                                <th key={s.id}>{s.name}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {compareRows.map((m) => (
                            <tr key={m} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td><code>{m}</code></td>
                                {items.map((s) => {
                                    const r = results[s.id]?.result.metrics[m];
                                    if (!r) return <td key={s.id} style={{ color: "#999" }}>—</td>;
                                    return (
                                        <td key={s.id}>
                                            <div><b>{r.p50.toFixed(2)}</b></div>
                                            <div style={{ color: "#666", fontSize: 12 }}>
                                                p10–p90: {r.p10.toFixed(2)} → {r.p90.toFixed(2)}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}