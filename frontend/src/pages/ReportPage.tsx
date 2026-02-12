import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type {
    BaselineCell,
    KpisResponse,
    BaselineWeek,
    Scenario,
    ScenarioKpisResponse,
    SimulationResponse,
    DataHealthResponse,
} from "../api/types";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    LineChart,
    Line,
    Legend,
} from "recharts";
import { WEEKDAYS, n, fmtCurrency, fmtPercent, fmtValue } from "../utils/format";
import { cardStyle, sectionStyle } from "../utils/styles";

type CompareMetricSummary = {
    p10: number;
    p50: number;
    p90: number;
};

export default function ReportPage() {
    const nav = useNavigate();

    // list of baseline weeks
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

    // baseline week data
    const [kpis, setKpis] = useState<KpisResponse | null>(null);
    const [grid, setGrid] = useState<BaselineCell[]>([]);
    const [health, setHealth] = useState<DataHealthResponse | null>(null);

    // scenarios
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [detKpis, setDetKpis] = useState<Record<number, ScenarioKpisResponse>>({});
    const [runningScenarioId, setRunningScenarioId] = useState<number | null>(null);
    const [scenarioResults, setScenarioResults] = useState<Record<number, SimulationResponse>>({});

    // UI
    const [loading, setLoading] = useState(true);
    const [loadingWeek, setLoadingWeek] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // run settings (shared)
    const [runs, setRuns] = useState(300);
    const [seed, setSeed] = useState<number | "">(42);

    // initial load weeks
    useEffect(() => {
        async function loadWeeks() {
            setError(null);
            setLoading(true);
            try {
                const w = await api.listWeeks();
                setWeeks(w);
                if (w.length > 0) setSelectedWeekId((prev) => prev ?? w[0].id);
            } catch (e) {
                setError(String(e));
            } finally {
                setLoading(false);
            }
        }
        loadWeeks();
    }, []);

    // load selected week data
    useEffect(() => {
        if (selectedWeekId == null) return;

        const weekId = selectedWeekId;

        async function loadWeek() {
            setError(null);
            setLoadingWeek(true);
            try {
                const [k, g, sc, h] = await Promise.all([
                    api.getKpis(weekId),
                    api.getBaselineData(weekId),
                    api.listScenarios(weekId),
                    api.getHealth(weekId).catch(() => null),
                ]);
                setKpis(k);
                setGrid(g);
                setScenarios(sc);
                setHealth(h);
                setScenarioResults({});

                // Fetch deterministic KPIs for each scenario
                const kpiMap: Record<number, ScenarioKpisResponse> = {};
                await Promise.all(
                    sc.map(async (s) => {
                        try {
                            kpiMap[s.id] = await api.getScenarioKpis(s.id);
                        } catch { /* ignore */ }
                    })
                );
                setDetKpis(kpiMap);
            } catch (e) {
                setError(String(e));
            } finally {
                setLoadingWeek(false);
            }
        }

        loadWeek();
    }, [selectedWeekId]);

    // derived: revenue by weekday — prefer timeseries from enriched KPI, fallback to grid
    const revenueByWeekday = useMemo(() => {
        if (kpis?.timeseries?.by_weekday?.length) {
            return kpis.timeseries.by_weekday.map((row) => ({
                weekday: WEEKDAYS[n(row["weekday"])] ?? `Day ${row["weekday"]}`,
                revenue: Math.round(n(row["finance.revenue"])),
                groups: n(row["demand.arrivals_groups"]),
                avgSpend: n(row["demand.arrivals_groups"]) > 0
                    ? Math.round(n(row["finance.revenue"]) / n(row["demand.arrivals_groups"]))
                    : 0,
            }));
        }

        // fallback: compute from grid
        const sums = Array.from({ length: 7 }, () => ({ revenue: 0, groups: 0 }));
        for (const c of grid) {
            const rev = n(c.arrivals_groups) * n((c as any).avg_spend_per_group);
            sums[c.weekday].revenue += rev;
            sums[c.weekday].groups += n(c.arrivals_groups);
        }

        return sums.map((x, i) => ({
            weekday: WEEKDAYS[i],
            revenue: Math.round(x.revenue),
            groups: x.groups,
            avgSpend: x.groups > 0 ? Math.round(x.revenue / x.groups) : 0,
        }));
    }, [grid, kpis]);

    // KPI values
    const kk = kpis?.kpis ?? {};
    const revenue = n(kk["finance.revenue"]);
    const profit = n(kk["finance.profit"]);
    const margin = n(kk["finance.profit_margin"]);
    const primeRatio = n(kk["finance.prime_cost_ratio"]);
    const laborRatio = n(kk["finance.labor_cost_ratio"]);
    const arrivals = n(kk["demand.arrivals_groups"]);
    const fixedCost = n(kk["finance.fixed_cost"]);
    const laborCost = n(kk["finance.labor_cost"]);
    const cogs = n(kk["finance.cogs"]);

    const headerBg: React.CSSProperties = {
        background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(0,153,255,0.22), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(255,0,122,0.16), transparent 55%)",
        borderRadius: 20,
        padding: 18,
        border: "1px solid rgba(255,255,255,0.3)",
    };

    const compareMetrics = useMemo(() => {
        return [
            "finance.profit",
            "finance.revenue",
            "finance.profit_margin",
            "finance.prime_cost_ratio",
            "demand.lost_groups",
        ];
    }, []);

    function exportJson() {
        const payload = {
            selected_week_id: selectedWeekId,
            baseline_kpis: kpis,
            baseline_grid: grid,
            scenarios,
            scenario_results: scenarioResults,
            deterministic_deltas: detKpis,
            health,
            run_settings: {
                runs,
                seed: seed === "" ? null : Number(seed),
            },
            exported_at: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bp-report-week-${selectedWeekId ?? "na"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function runScenario(scenarioId: number) {
        setRunningScenarioId(scenarioId);
        setError(null);
        try {
            const res = await api.runScenario(scenarioId, {
                runs,
                seed: seed === "" ? null : Number(seed),
            });
            setScenarioResults((prev) => ({ ...prev, [scenarioId]: res }));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunningScenarioId(null);
        }
    }

    async function runAllScenarios() {
        setError(null);
        try {
            for (const s of scenarios) {
                setRunningScenarioId(s.id);
                const res = await api.runScenario(s.id, {
                    runs,
                    seed: seed === "" ? null : Number(seed),
                });
                setScenarioResults((prev) => ({ ...prev, [s.id]: res }));
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setRunningScenarioId(null);
        }
    }

    const scenarioCompareTable = useMemo(() => {
        const table: Record<number, Record<string, CompareMetricSummary | null>> = {};
        for (const s of scenarios) {
            const r = scenarioResults[s.id];
            const m: Record<string, CompareMetricSummary | null> = {};
            for (const key of compareMetrics) {
                const x = r?.result?.metrics?.[key];
                m[key] = x ? { p10: x.p10, p50: x.p50, p90: x.p90 } : null;
            }
            table[s.id] = m;
        }
        return table;
    }, [scenarios, scenarioResults, compareMetrics]);

    if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1300, fontFamily: "system-ui" }}>
            <div style={headerBg}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#666" }}>BP · One-page report</div>
                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.6 }}>
                            Report · Baseline + Experiments
                        </div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                            Select a baseline week, review KPIs + demand pattern, then compare saved scenarios.
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <Link to="/baseline-weeks">← Baseline weeks</Link>
                        {selectedWeekId && (
                            <>
                                <Link to={`/baseline-weeks/${selectedWeekId}/dashboard`}>Dashboard</Link>
                                <Link to={`/baseline-weeks/${selectedWeekId}/grid`}>Grid</Link>
                                <Link to={`/baseline-weeks/${selectedWeekId}/kpis`}>KPI</Link>
                                <Link to={`/baseline-weeks/${selectedWeekId}/scenarios`}>Scenarios</Link>
                            </>
                        )}
                        <button onClick={exportJson}>Export JSON</button>
                    </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Baseline week</div>
                    <select
                        value={selectedWeekId ?? ""}
                        onChange={(e) => setSelectedWeekId(e.target.value === "" ? null : Number(e.target.value))}
                        style={{ padding: 8, borderRadius: 10, border: "1px solid #ddd", minWidth: 240 }}
                    >
                        {weeks.map((w) => (
                            <option key={w.id} value={w.id}>
                                #{w.id} · {w.label} · {w.week_start}
                            </option>
                        ))}
                    </select>

                    {selectedWeekId && (
                        <button
                            onClick={() => nav(`/baseline-weeks/${selectedWeekId}/dashboard`)}
                            style={{ padding: "8px 10px", borderRadius: 10 }}
                        >
                            Open dashboard →
                        </button>
                    )}

                    {loadingWeek && <div style={{ color: "#666", fontSize: 12 }}>Loading week data…</div>}
                </div>
            </div>

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

            {/* KPI cards */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Revenue</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtCurrency(revenue)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtCurrency(profit)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit margin</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtPercent(margin)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Prime cost ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtPercent(primeRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Labor ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{fmtPercent(laborRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Arrivals (groups)</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{arrivals.toFixed(0)}</div>
                </div>
            </div>

            {/* Cost breakdown + data health */}
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>COGS</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{fmtCurrency(cogs)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Labor cost</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{fmtCurrency(laborCost)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Fixed cost</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{fmtCurrency(fixedCost)}</div>
                </div>
                {/* Data Health card */}
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Data health</div>
                    {health ? (
                        <div style={{ marginTop: 4 }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: health.coverage_score >= 80 ? "#16a34a" : "#f59e0b" }}>
                                    {health.coverage_score}%
                                </div>
                                <div style={{ fontSize: 12, color: "#888" }}>
                                    coverage · {health.checks.filter((c) => c.status === "ok").length}/{health.checks.length} checks
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                Actionability: {health.actionability_score}/100
                            </div>
                            {health.recommendations.length > 0 && (
                                <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                                    💡 {health.recommendations[0]}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Loading…</div>
                    )}
                </div>
            </div>

            {/* Charts */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>Revenue by weekday</div>
                        <div style={{ color: "#666", fontSize: 12 }}>
                            {kpis?.timeseries ? "From enriched KPI timeseries." : "Derived: arrivals_groups × avg_spend_per_group."}
                        </div>
                    </div>

                    <div style={{ height: 280, marginTop: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByWeekday}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="weekday" />
                                <YAxis />
                                <Tooltip formatter={(v: any, name: any) => (name === "revenue" ? fmtCurrency(n(v)) : v)} />
                                <Legend />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>Demand & avg spend</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Groups + derived avg spend per group.</div>
                    </div>

                    <div style={{ height: 280, marginTop: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueByWeekday}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="weekday" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="groups" stroke="#6366f1" />
                                <Line type="monotone" dataKey="avgSpend" stroke="#f43f5e" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Scenarios compare */}
            <div style={{ marginTop: 14, ...sectionStyle() }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>Experiments · saved scenarios</div>
                        <div style={{ color: "#666", fontSize: 12 }}>
                            Deterministic deltas shown instantly. Run scenarios for stochastic p50 + p10–p90 results.
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
                                Runs
                                <input type="number" value={runs} min={10} max={5000} onChange={(e) => setRuns(Number(e.target.value))} />
                            </label>
                            <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
                                Seed
                                <input
                                    type="number"
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))}
                                />
                            </label>
                        </div>

                        <button onClick={() => selectedWeekId && nav(`/baseline-weeks/${selectedWeekId}/scenarios`)}>Create/Edit scenarios →</button>
                        <button onClick={runAllScenarios} disabled={runningScenarioId !== null || scenarios.length === 0}>
                            {runningScenarioId !== null ? "Running…" : "Run all"}
                        </button>
                    </div>
                </div>

                {scenarios.length === 0 ? (
                    <div style={{ marginTop: 12, color: "#666" }}>
                        No scenarios for this week. Create them in{" "}
                        {selectedWeekId ? <Link to={`/baseline-weeks/${selectedWeekId}/scenarios`}>Scenarios</Link> : "Scenarios"}.
                    </div>
                ) : (
                    <>
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                            {scenarios.map((s) => (
                                <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.6)" }}>
                                    <div style={{ fontWeight: 900 }}>{s.name}</div>
                                    <div style={{ color: "#666", fontSize: 12 }}>id: {s.id} · {s.created_at}</div>

                                    <button
                                        onClick={() => runScenario(s.id)}
                                        disabled={runningScenarioId !== null}
                                        style={{ marginTop: 10 }}
                                    >
                                        {runningScenarioId === s.id ? "Running…" : "Run"}
                                    </button>

                                    {scenarioResults[s.id] && (
                                        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                                            Done · runs: {scenarioResults[s.id].result.runs}
                                        </div>
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

                        <div style={{ marginTop: 14, overflowX: "auto" }}>
                            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 1000 }}>
                                <thead>
                                    <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                                        <th>Metric</th>
                                        {scenarios.map((s) => (
                                            <th key={s.id}>{s.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {compareMetrics.map((m) => (
                                        <tr key={m} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                            <td><code>{m}</code></td>
                                            {scenarios.map((s) => {
                                                const x = scenarioCompareTable[s.id]?.[m] ?? null;
                                                if (!x) return <td key={s.id} style={{ color: "#999" }}>—</td>;
                                                return (
                                                    <td key={s.id}>
                                                        <div><b>{fmtValue(m, x.p50)}</b></div>
                                                        <div style={{ color: "#666", fontSize: 12 }}>
                                                            p10–p90: {fmtValue(m, x.p10)} → {fmtValue(m, x.p90)}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Quick links */}
            {selectedWeekId && (
                <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
                    Quick:{" "}
                    <Link to={`/baseline-weeks/${selectedWeekId}/grid`}>edit baseline</Link> ·{" "}
                    <Link to={`/baseline-weeks/${selectedWeekId}/dashboard`}>open dashboard</Link> ·{" "}
                    <Link to={`/simulation?weekId=${selectedWeekId}`}>simulation</Link>
                </div>
            )}
        </div>
    );
}