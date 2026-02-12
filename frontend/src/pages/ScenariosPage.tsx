import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { Scenario, ScenarioKpisResponse, SimulationResponse, StaffingChange, SimulationOverrides } from "../api/types";

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function defaultOverrides(): SimulationOverrides {
    return {
        staffing_changes: [],
        price_change: null,
        capacity_changes: null,
        opening_hours_changes: [],
        arrivals_multiplier: 1.0,
        spend_multiplier: 1.0,
        food_cost_pct_override: null,
        fixed_cost_week_override: null,
    };
}

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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScenariosPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    // saved scenarios
    const [items, setItems] = useState<Scenario[]>([]);
    const [results, setResults] = useState<Record<number, SimulationResponse>>({});
    const [detKpis, setDetKpis] = useState<Record<number, ScenarioKpisResponse>>({});
    const [running, setRunning] = useState<number | null>(null);
    const [runAllRunning, setRunAllRunning] = useState(false);

    // data for dropdowns
    const [dayparts, setDayparts] = useState<{ id: number; label: string }[]>([]);

    // create form state
    const [name, setName] = useState("New scenario");
    const [overrides, setOverrides] = useState<SimulationOverrides>(defaultOverrides());

    // new staffing delta row builder
    const [deltaWeekday, setDeltaWeekday] = useState(5);
    const [deltaDaypartId, setDeltaDaypartId] = useState<number | null>(null);
    const [deltaRole, setDeltaRole] = useState<"kitchen" | "service">("kitchen");
    const [deltaCount, setDeltaCount] = useState(1);

    // advanced mode
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [overridesJson, setOverridesJson] = useState(JSON.stringify(defaultOverrides(), null, 2));

    // run settings
    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState<number | "">(42);

    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        try {
            const [sc, dp] = await Promise.all([api.listScenarios(week), api.listDayparts()]);
            setItems(sc);
            setDayparts(dp.map((d) => ({ id: d.id, label: d.label })));

            // Fetch deterministic KPIs for each scenario
            const kpiMap: Record<number, ScenarioKpisResponse> = {};
            await Promise.all(
                sc.map(async (s) => {
                    try {
                        kpiMap[s.id] = await api.getScenarioKpis(s.id);
                    } catch { /* ignore errors for individual fetches */ }
                })
            );
            setDetKpis(kpiMap);

            // initialize delta daypart default
            if (dp.length > 0 && deltaDaypartId === null) setDeltaDaypartId(dp[0].id);
        } catch (e) {
            setError(String(e));
        }
    }

    async function runAll() {
        setError(null);
        setRunAllRunning(true);
        try {
            for (const s of items) {
                setRunning(s.id);
                const res = await api.runScenario(s.id, {
                    runs,
                    seed: seed === "" ? null : Number(seed),
                });
                setResults((prev) => ({ ...prev, [s.id]: res }));
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(null);
            setRunAllRunning(false);
        }
    }

    useEffect(() => {
        if (!Number.isFinite(week)) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [week]);

    // keep advanced JSON in sync when not editing it
    useEffect(() => {
        if (!advancedOpen) {
            setOverridesJson(JSON.stringify(overrides, null, 2));
        }
    }, [overrides, advancedOpen]);

    function setMultiplier(kind: "arrivals" | "spend", v: number) {
        const value = clamp(v, 0.5, 1.5);
        setOverrides((prev) => ({
            ...prev,
            arrivals_multiplier: kind === "arrivals" ? value : prev.arrivals_multiplier,
            spend_multiplier: kind === "spend" ? value : prev.spend_multiplier,
        }));
    }

    function addStaffingDelta() {
        if (!deltaDaypartId) return;

        const row: StaffingChange = {
            weekday: deltaWeekday,
            daypart_id: deltaDaypartId,
            role: deltaRole,
            delta_staff: Number(deltaCount),
        };

        setOverrides((prev) => ({
            ...prev,
            staffing_changes: [...prev.staffing_changes, row],
        }));
    }

    function removeStaffingDelta(index: number) {
        setOverrides((prev) => ({
            ...prev,
            staffing_changes: prev.staffing_changes.filter((_: StaffingChange, i: number) => i !== index),
        }));
    }

    function resetForm() {
        setName("New scenario");
        setOverrides(defaultOverrides());
        setAdvancedOpen(false);
        setOverridesJson(JSON.stringify(defaultOverrides(), null, 2));
    }

    async function createScenario() {
        setError(null);
        try {
            let params: any = overrides;

            if (advancedOpen) {
                try {
                    params = JSON.parse(overridesJson);
                } catch {
                    throw new Error("Invalid JSON in Advanced overrides.");
                }
            }

            await api.createScenario(week, { name: name.trim() || "Scenario", params });
            await load();
            resetForm();
        } catch (e) {
            setError(String(e));
        }
    }

    async function runScenario(scenarioId: number) {
        setRunning(scenarioId);
        setError(null);
        try {
            const res = await api.runScenario(scenarioId, {
                runs,
                seed: seed === "" ? null : Number(seed),
            });
            setResults((prev) => ({ ...prev, [scenarioId]: res }));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunning(null);
        }
    }

    function clearResults() {
        setResults({});
    }

    const compareMetrics = useMemo(() => {
        return ["finance.revenue", "finance.profit", "demand.served_groups", "demand.lost_groups", "queue.wait_table", "queue.wait_food", "util.kitchen", "util.tables"];
    }, []);

    if (!Number.isFinite(week)) {
        return <div style={{ padding: 24 }}>Invalid weekId.</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, fontFamily: "system-ui" }}>
            <h1>Scenarios (week #{week})</h1>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
                <Link to={`/baseline-weeks/${week}/grid`}>Grid</Link>
                <Link to={`/baseline-weeks/${week}/kpis`}>KPI</Link>
                <Link to={`/simulation?weekId=${week}`}>Simulation</Link>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            {/* Run controls */}
            <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Run settings</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 400 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        Runs
                        <input type="number" value={runs} min={10} max={5000} onChange={(e) => setRuns(Number(e.target.value))} />
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

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={clearResults} disabled={Object.keys(results).length === 0}>
                        Clear results
                    </button>
                    <div style={{ color: "#666", fontSize: 12 }}>
                        Clears only the in-memory compare results (does not delete scenarios).
                    </div>
                </div>
            </div>

            {/* Create scenario */}
            <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Create scenario</h3>

                <label style={{ display: "block" }}>
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </label>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Demand / price multipliers */}
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700 }}>Demand & price</div>

                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                            Arrivals multiplier ({overrides.arrivals_multiplier.toFixed(2)})
                            <input
                                type="range"
                                min={0.5}
                                max={1.5}
                                step={0.01}
                                value={overrides.arrivals_multiplier}
                                onChange={(e) => setMultiplier("arrivals", Number(e.target.value))}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                            Spend multiplier ({overrides.spend_multiplier.toFixed(2)})
                            <input
                                type="range"
                                min={0.5}
                                max={1.5}
                                step={0.01}
                                value={overrides.spend_multiplier}
                                onChange={(e) => setMultiplier("spend", Number(e.target.value))}
                            />
                        </label>

                        <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>Example: spend 1.05 = +5% average spend per group.</div>
                    </div>

                    {/* Costs overrides */}
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700 }}>Costs overrides (optional)</div>

                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                            Fixed cost / week override (CZK)
                            <input
                                type="number"
                                value={overrides.fixed_cost_week_override ?? ""}
                                placeholder="(leave empty)"
                                onChange={(e) =>
                                    setOverrides((prev) => ({
                                        ...prev,
                                        fixed_cost_week_override: e.target.value === "" ? null : Number(e.target.value),
                                    }))
                                }
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                            Food cost % override (0–1)
                            <input
                                type="number"
                                step="0.01"
                                value={overrides.food_cost_pct_override ?? ""}
                                placeholder="(leave empty)"
                                onChange={(e) =>
                                    setOverrides((prev) => ({
                                        ...prev,
                                        food_cost_pct_override: e.target.value === "" ? null : Number(e.target.value),
                                    }))
                                }
                            />
                        </label>

                        <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>Overrides apply only to this scenario.</div>
                    </div>
                </div>

                {/* Staffing delta builder */}
                <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>Staffing changes (delta)</div>

                    {dayparts.length === 0 ? (
                        <div style={{ marginTop: 10, color: "#666" }}>No dayparts available. Create dayparts first.</div>
                    ) : (
                        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                Weekday
                                <select value={deltaWeekday} onChange={(e) => setDeltaWeekday(Number(e.target.value))}>
                                    {WEEKDAYS.map((w, i) => (
                                        <option key={w} value={i}>
                                            {w}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                Daypart
                                <select value={deltaDaypartId ?? ""} onChange={(e) => setDeltaDaypartId(Number(e.target.value))}>
                                    {dayparts.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                Role
                                <select value={deltaRole} onChange={(e) => setDeltaRole(e.target.value as any)}>
                                    <option value="kitchen">kitchen</option>
                                    <option value="service">service</option>
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                Delta (+/-)
                                <input type="number" value={deltaCount} onChange={(e) => setDeltaCount(Number(e.target.value))} />
                            </label>

                            <button onClick={addStaffingDelta} disabled={deltaDaypartId === null}>
                                Add
                            </button>
                        </div>
                    )}

                    {overrides.staffing_changes.length === 0 ? (
                        <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>No staffing changes.</div>
                    ) : (
                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, color: "#666" }}>Current changes:</div>
                            <ul style={{ marginTop: 6 }}>
                                {overrides.staffing_changes.map((d: StaffingChange, idx: number) => (
                                    <li key={idx} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <span>
                                            {WEEKDAYS[d.weekday]} · daypart #{d.daypart_id} · {d.role} · delta{" "}
                                            {d.delta_staff > 0 ? `+${d.delta_staff}` : d.delta_staff}
                                        </span>
                                        <button onClick={() => removeStaffingDelta(idx)}>Remove</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Advanced JSON */}
                <div style={{ marginTop: 12 }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input type="checkbox" checked={advancedOpen} onChange={(e) => setAdvancedOpen(e.target.checked)} />
                        Advanced (edit raw JSON)
                    </label>

                    {advancedOpen && (
                        <textarea
                            value={overridesJson}
                            onChange={(e) => setOverridesJson(e.target.value)}
                            rows={10}
                            style={{
                                marginTop: 8,
                                width: "100%",
                                padding: 10,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            }}
                        />
                    )}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button onClick={createScenario}>Save scenario</button>
                    <button onClick={resetForm}>Reset</button>
                </div>
            </div>

            {/* Scenario list */}
            <div style={{ marginTop: 18 }}>
                <h3>Saved scenarios</h3>

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                    <button onClick={runAll} disabled={runAllRunning || running !== null || items.length === 0}>
                        {runAllRunning ? "Running all…" : "Run all scenarios"}
                    </button>
                    <div style={{ color: "#666", fontSize: 12 }}>Runs scenarios sequentially and fills the compare table.</div>
                </div>

                {items.length === 0 ? (
                    <p>No scenarios yet.</p>
                ) : (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {items.map((s) => (
                            <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontWeight: 700 }}>{s.name}</div>
                                <div style={{ color: "#666", fontSize: 12 }}>id: {s.id} · {s.created_at}</div>

                                <button onClick={() => runScenario(s.id)} disabled={runAllRunning || running !== null} style={{ marginTop: 10 }}>
                                    {running === s.id ? "Running…" : "Run"}
                                </button>

                                {results[s.id] && (
                                    <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>Done · runs: {results[s.id].result.runs}</div>
                                )}

                                {/* Deterministic KPI deltas */}
                                {detKpis[s.id] && (() => {
                                    const d = detKpis[s.id].deltas;
                                    const deltaItems = [
                                        { label: "Δ Revenue", key: "finance.revenue", fmt: fmtCurrency, better: "up" as const },
                                        { label: "Δ Profit", key: "finance.profit", fmt: fmtCurrency, better: "up" as const },
                                        { label: "Δ Labor", key: "finance.labor_cost", fmt: fmtCurrency, better: "down" as const },
                                        { label: "Δ Arrivals", key: "demand.arrivals_groups", fmt: (v: number) => (v > 0 ? "+" : "") + v, better: "up" as const },
                                    ];
                                    return (
                                        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                                            {deltaItems.map((item) => {
                                                const val = d[item.key] ?? 0;
                                                const good = item.better === "up" ? val > 0 : val < 0;
                                                const neutral = Math.abs(val) < 0.01;
                                                const color = neutral ? "#888" : good ? "#16a34a" : "#dc2626";
                                                return (
                                                    <div key={item.key} style={{ textAlign: "center", padding: 6, borderRadius: 8, background: "#f8f9fa" }}>
                                                        <div style={{ fontSize: 11, color: "#666" }}>{item.label}</div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color }}>
                                                            {val > 0 && item.key !== "demand.arrivals_groups" ? "+" : ""}{item.fmt(val)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

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

            {/* Compare */}
            <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Compare (run results)</h3>

                <div style={{ overflowX: "auto" }}>
                    <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 1000 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                                <th>Metric</th>
                                {items.map((s) => (
                                    <th key={s.id}>{s.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {compareMetrics.map((m) => (
                                <tr key={m} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                    <td>
                                        <code>{m}</code>
                                    </td>
                                    {items.map((s) => {
                                        const r = results[s.id]?.result.metrics[m];
                                        if (!r) return <td key={s.id} style={{ color: "#999" }}>—</td>;
                                        return (
                                            <td key={s.id}>
                                                <div>
                                                    <b>{fmtValue(m, r.p50)}</b>
                                                </div>
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

                <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>Tip: Run scenarios first to populate compare table.</div>
            </div>
        </div>
    );
}