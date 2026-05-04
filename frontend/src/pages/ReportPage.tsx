import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import { n, fmtCurrency, fmtPercent, fmtValue, WEEKDAYS } from "../utils/format";
import type { BaselineCell, KpisResponse, BaselineWeek, Scenario, ScenarioKpisResponse, SimulationResponse, DataHealthResponse, MetricSummary } from "../api/types";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend, ComposedChart, Line } from "recharts";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import ChartTooltip from "../components/ChartTooltip";
import { useSimDefaults } from "../hooks/useSimDefaults";

const CB = "#3366FF";
const CG = "#04FF87";

type CompareMetricSummary = Pick<MetricSummary, "p10" | "p50" | "p90">;

export default function ReportPage() {
    const nav = useNavigate();

    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

    const [kpis, setKpis] = useState<KpisResponse | null>(null);
    const [grid, setGrid] = useState<BaselineCell[]>([]);
    const [health, setHealth] = useState<DataHealthResponse | null>(null);

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [detKpis, setDetKpis] = useState<Record<number, ScenarioKpisResponse>>({});
    const [runningScenarioId, setRunningScenarioId] = useState<number | null>(null);
    const [scenarioResults, setScenarioResults] = useState<Record<number, SimulationResponse>>({});

    const [loading, setLoading] = useState(true);
    const [loadingWeek, setLoadingWeek] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { runs, setRuns, seed, setSeed } = useSimDefaults();

    useEffect(() => {
        async function loadWeeks() {
            setError(null); setLoading(true);
            try { const w = await api.listWeeks(); setWeeks(w); if (w.length > 0) setSelectedWeekId((prev) => prev ?? w[0].id); }
            catch (e) { setError(String(e)); }
            finally { setLoading(false); }
        }
        loadWeeks();
    }, []);

    useEffect(() => {
        if (selectedWeekId == null) return;
        const weekId = selectedWeekId;
        async function loadWeek() {
            setError(null); setLoadingWeek(true);
            try {
                const [k, g, sc, h] = await Promise.all([api.getKpis(weekId), api.getBaselineData(weekId), api.listScenarios(weekId), api.getHealth(weekId).catch(() => null)]);
                setKpis(k); setGrid(g); setScenarios(sc); setHealth(h); setScenarioResults({});
                const kpiMap: Record<number, ScenarioKpisResponse> = {};
                await Promise.all(sc.map(async (s) => { try { kpiMap[s.id] = await api.getScenarioKpis(s.id); } catch { } }));
                setDetKpis(kpiMap);
            } catch (e) { setError(String(e)); }
            finally { setLoadingWeek(false); }
        }
        loadWeek();
    }, [selectedWeekId]);

    const revenueByWeekday = useMemo(() => {
        if (kpis?.timeseries?.by_weekday?.length) {
            return kpis.timeseries.by_weekday.map((row) => ({
                weekday: WEEKDAYS[n(row["weekday"])] ?? `Day ${row["weekday"]}`,
                revenue: Math.round(n(row["finance.revenue"])),
                groups: n(row["demand.arrivals_groups"]),
                avgSpend: n(row["demand.arrivals_groups"]) > 0 ? Math.round(n(row["finance.revenue"]) / n(row["demand.arrivals_groups"])) : 0,
            }));
        }
        const sums = Array.from({ length: 7 }, () => ({ revenue: 0, groups: 0 }));
        for (const c of grid) { const rev = n(c.arrivals_groups) * n(c.avg_spend_per_group); sums[c.weekday].revenue += rev; sums[c.weekday].groups += n(c.arrivals_groups); }
        return sums.map((x, i) => ({ weekday: WEEKDAYS[i], revenue: Math.round(x.revenue), groups: x.groups, avgSpend: x.groups > 0 ? Math.round(x.revenue / x.groups) : 0 }));
    }, [grid, kpis]);

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

    const compareMetrics = useMemo(() => ["finance.profit", "finance.revenue", "finance.profit_margin", "finance.prime_cost_ratio", "demand.lost_groups"], []);

    function exportJson() {
        const payload = { selected_week_id: selectedWeekId, baseline_kpis: kpis, baseline_grid: grid, scenarios, scenario_results: scenarioResults, deterministic_deltas: detKpis, health, run_settings: { runs, seed: seed === "" ? null : Number(seed) }, exported_at: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `bp-report-week-${selectedWeekId ?? "na"}.json`; a.click(); URL.revokeObjectURL(url);
    }

    async function runScenario(scenarioId: number) {
        setRunningScenarioId(scenarioId); setError(null);
        try { const res = await api.runScenario(scenarioId, { runs, seed: seed === "" ? null : Number(seed) }); setScenarioResults((prev) => ({ ...prev, [scenarioId]: res })); }
        catch (e) { setError(String(e)); }
        finally { setRunningScenarioId(null); }
    }

    async function runAllScenarios() {
        setError(null);
        try { for (const s of scenarios) { setRunningScenarioId(s.id); const res = await api.runScenario(s.id, { runs, seed: seed === "" ? null : Number(seed) }); setScenarioResults((prev) => ({ ...prev, [s.id]: res })); } }
        catch (e) { setError(String(e)); }
        finally { setRunningScenarioId(null); }
    }

    const scenarioCompareTable = useMemo(() => {
        const table: Record<number, Record<string, CompareMetricSummary | null>> = {};
        for (const s of scenarios) { const r = scenarioResults[s.id]; const m: Record<string, CompareMetricSummary | null> = {}; for (const key of compareMetrics) { const x = r?.result?.metrics?.[key]; m[key] = x ? { p10: x.p10, p50: x.p50, p90: x.p90 } : null; } table[s.id] = m; }
        return table;
    }, [scenarios, scenarioResults, compareMetrics]);

    if (loading) return (
        <div className="flex items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
            <span className="text-grey">Loading report…</span>
        </div>
    );

    const kpiCards = [
        { label: "Revenue", value: fmtCurrency(revenue), icon: "💰", color: "from-deep-blue to-blue-700" },
        { label: "Profit", value: fmtCurrency(profit), icon: "📈", color: "from-emerald-500 to-green-600" },
        { label: "Profit margin", value: fmtPercent(margin), icon: "📊", color: "from-emerald-500 to-green-600" },
        { label: "Prime cost ratio", value: fmtPercent(primeRatio), icon: "⚙️", color: "from-amber-500 to-orange-600" },
        { label: "Labor ratio", value: fmtPercent(laborRatio), icon: "👷", color: "from-indigo-500 to-violet-600" },
        { label: "Arrivals (groups)", value: arrivals.toFixed(0), icon: "🚗", color: "from-deep-blue to-indigo-600" },
    ];

    const costBreakdownTotal = cogs + laborCost + fixedCost || 1;

    return (
        <div>
            <PageHeader title="Report · Baseline + Experiments" subtitle="Select a baseline week, review KPIs + demand pattern, then compare saved scenarios.">
                <div className="flex gap-3 flex-wrap items-center">
                    <Link to="/baseline-weeks" className="text-sm text-deep-blue hover:underline">← Baseline weeks</Link>
                    {selectedWeekId && (
                        <>
                            <Link to={`/baseline-weeks/${selectedWeekId}/dashboard`} className="text-sm text-deep-blue hover:underline">Dashboard</Link>
                            <Link to={`/baseline-weeks/${selectedWeekId}/grid`} className="text-sm text-deep-blue hover:underline">Grid</Link>
                            <Link to={`/baseline-weeks/${selectedWeekId}/kpis`} className="text-sm text-deep-blue hover:underline">KPI</Link>
                            <Link to={`/baseline-weeks/${selectedWeekId}/scenarios`} className="text-sm text-deep-blue hover:underline">Scenarios</Link>
                        </>
                    )}
                    <Button variant="secondary" size="sm" onClick={exportJson}>📥 Export JSON</Button>

                </div>
            </PageHeader>

            {/* Week selector */}
            <Card className="p-5 mb-5">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-deep-blue to-indigo-600 flex items-center justify-center text-white text-sm shadow-lg shadow-deep-blue/20">📅</div>
                        <div>
                            <label className="block text-xs text-grey mb-1">Baseline week</label>
                            <select value={selectedWeekId ?? ""} onChange={(e) => setSelectedWeekId(e.target.value === "" ? null : Number(e.target.value))} className="min-w-[240px]">
                                {weeks.map((w) => <option key={w.id} value={w.id}>#{w.id} · {w.label} · {w.week_start}</option>)}
                            </select>
                        </div>
                    </div>
                    {selectedWeekId && <Button size="sm" onClick={() => nav(`/baseline-weeks/${selectedWeekId}/dashboard`)}>Open dashboard →</Button>}
                    {loadingWeek && (
                        <span className="flex items-center gap-1.5 text-xs text-grey">
                            <span className="w-3 h-3 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                            Loading week data…
                        </span>
                    )}
                </div>
            </Card>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                {kpiCards.map((kpi) => (
                    <Card key={kpi.label} className="p-4 group hover:scale-[1.03] transition-transform duration-200">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-[10px] text-grey uppercase tracking-wider font-medium">{kpi.label}</div>
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-xs shadow-md flex-shrink-0`}>
                                {kpi.icon}
                            </div>
                        </div>
                        <div className="text-lg font-extrabold text-mariana">{kpi.value}</div>
                    </Card>
                ))}
            </div>

            {/* Cost breakdown bars */}
            <Card className="p-5 mb-5">
                <h3 className="text-sm font-bold text-mariana mb-3">Cost Breakdown</h3>
                <div className="space-y-3">
                    {[
                        { label: "COGS", value: cogs, color: "bg-amber-500" },
                        { label: "Labor", value: laborCost, color: "bg-indigo-500" },
                        { label: "Fixed", value: fixedCost, color: "bg-slate-400" },
                    ].map((item) => (
                        <div key={item.label}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-grey font-medium">{item.label}</span>
                                <span className="font-bold text-mariana">{fmtCurrency(item.value)}</span>
                            </div>
                            <div className="h-2 bg-mist-dark/10 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`} style={{ width: `${(item.value / costBreakdownTotal) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
                {/* Data health inline */}
                {health && (
                    <div className="mt-4 pt-4 border-t border-mist-dark/20 flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-grey font-medium">Data Health:</span>
                            <span className={`text-sm font-extrabold ${health.coverage_score >= 80 ? "text-green-600" : "text-amber-500"}`}>{health.coverage_score}%</span>
                        </div>
                        <span className="text-[10px] text-grey">{health.checks.filter((c) => c.status === "ok").length}/{health.checks.length} checks · actionability {health.actionability_score}/100</span>
                        {health.recommendations.length > 0 && <span className="text-[10px] text-amber-600">💡 {health.recommendations[0]}</span>}
                    </div>
                )}
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
                <Card className="lg:col-span-3 p-5">
                    <h3 className="text-sm font-bold text-mariana">Revenue by weekday</h3>
                    <p className="text-xs text-grey mb-3">{kpis?.timeseries ? "From enriched KPI timeseries." : "Derived: arrivals_groups × avg_spend_per_group."}</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueByWeekday}>
                                <defs>
                                    <linearGradient id="rptGradRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CB} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={CB} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="weekday" tick={{ fill: "#9BAAB9", fontSize: 11 }} />
                                <YAxis tick={{ fill: "#9BAAB9", fontSize: 11 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" stroke={CB} fill="url(#rptGradRev)" strokeWidth={2} name="Revenue" />
                                <Line type="monotone" dataKey="avgSpend" stroke={CG} strokeWidth={2} dot={{ fill: CG, r: 3 }} name="Avg Spend" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-5">
                    <h3 className="text-sm font-bold text-mariana">Demand & avg spend</h3>
                    <p className="text-xs text-grey mb-3">Groups + derived avg spend per group.</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueByWeekday}>
                                <defs>
                                    <linearGradient id="rptGradGrp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CB} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={CB} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="weekday" tick={{ fill: "#9BAAB9", fontSize: 11 }} />
                                <YAxis tick={{ fill: "#9BAAB9", fontSize: 11 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="groups" stroke={CB} fill="url(#rptGradGrp)" strokeWidth={2} name="Groups" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Scenarios compare section */}
            <Card className="p-5 mb-5">
                <div className="flex justify-between items-start gap-3 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm shadow-lg">🧪</div>
                        <div>
                            <h3 className="text-sm font-bold text-mariana">Experiments · saved scenarios</h3>
                            <p className="text-xs text-grey">Deterministic deltas shown instantly. Run scenarios for stochastic p50 + p10–p90.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] text-grey mb-0.5">Runs</label><input type="number" value={runs} min={10} max={5000} onChange={(e) => setRuns(Number(e.target.value))} className="!w-20" /></div>
                            <div><label className="block text-[10px] text-grey mb-0.5">Seed</label><input type="number" value={seed} onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))} className="!w-20" /></div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => selectedWeekId && nav(`/baseline-weeks/${selectedWeekId}/scenarios`)}>Create/Edit →</Button>
                        <Button size="sm" onClick={runAllScenarios} disabled={runningScenarioId !== null || scenarios.length === 0}>
                            {runningScenarioId !== null ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running…
                                </span>
                            ) : "▶ Run all"}
                        </Button>
                    </div>
                </div>

                {scenarios.length === 0 ? (
                    <div className="text-center py-6">
                        <div className="text-2xl mb-2">🔬</div>
                        <p className="text-sm text-grey">
                            No scenarios for this week. Create them in{" "}
                            {selectedWeekId ? <Link to={`/baseline-weeks/${selectedWeekId}/scenarios`} className="text-deep-blue hover:underline">Scenarios</Link> : "Scenarios"}.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            {scenarios.map((s) => (
                                <div key={s.id} className="border border-mist-dark/20 rounded-xl p-4 bg-white/60 hover:bg-white/80 transition-colors duration-200">
                                    <div className="font-bold text-sm text-mariana">{s.name}</div>
                                    <div className="text-[10px] text-grey mt-0.5">id: {s.id} · {s.created_at}</div>

                                    <div className="mt-2 flex gap-2 items-center">
                                        <Button size="sm" onClick={() => runScenario(s.id)} disabled={runningScenarioId !== null}>
                                            {runningScenarioId === s.id ? (
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Running…
                                                </span>
                                            ) : "▶ Run"}
                                        </Button>
                                        {scenarioResults[s.id] && <span className="text-xs text-algae-dark font-medium">✓ {scenarioResults[s.id].result.runs} runs</span>}
                                    </div>

                                    {detKpis[s.id] && (() => {
                                        const d = detKpis[s.id].deltas;
                                        const deltaItems = [
                                            { label: "Δ Revenue", key: "finance.revenue", fmt: fmtCurrency, better: "up" as const },
                                            { label: "Δ Profit", key: "finance.profit", fmt: fmtCurrency, better: "up" as const },
                                            { label: "Δ Labor", key: "finance.labor_cost", fmt: fmtCurrency, better: "down" as const },
                                            { label: "Δ Arrivals", key: "demand.arrivals_groups", fmt: (v: number) => (v > 0 ? "+" : "") + v, better: "up" as const },
                                        ];
                                        return (
                                            <div className="mt-3 grid grid-cols-4 gap-2">
                                                {deltaItems.map((item) => {
                                                    const val = d[item.key] ?? 0;
                                                    const good = item.better === "up" ? val > 0 : val < 0;
                                                    const neutral = Math.abs(val) < 0.01;
                                                    const color = neutral ? "text-grey" : good ? "text-green-600" : "text-red-600";
                                                    return (
                                                        <div key={item.key} className="text-center bg-mist/20 rounded-lg p-2">
                                                            <div className="text-[10px] text-grey">{item.label}</div>
                                                            <div className={`text-sm font-bold ${color}`}>
                                                                {val > 0 && item.key !== "demand.arrivals_groups" ? "+" : ""}{item.fmt(val)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    <details className="mt-2">
                                        <summary className="text-xs text-grey cursor-pointer hover:text-mariana transition">Overrides</summary>
                                        <pre className="mt-1 bg-white rounded-lg p-2 text-[10px] overflow-x-auto border border-mist-dark/20">{JSON.stringify(s.params, null, 2)}</pre>
                                    </details>
                                </div>
                            ))}
                        </div>

                        {/* Compare table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-[900px]">
                                <thead>
                                    <tr>
                                        <th className="!pl-5">Metric</th>
                                        {scenarios.map((s) => <th key={s.id} className="text-right">{s.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {compareMetrics.map((m) => (
                                        <tr key={m}>
                                            <td className="!pl-5 font-mono text-xs">{m}</td>
                                            {scenarios.map((s) => {
                                                const x = scenarioCompareTable[s.id]?.[m] ?? null;
                                                if (!x) return <td key={s.id} className="text-right text-grey">—</td>;
                                                return (
                                                    <td key={s.id} className="text-right">
                                                        <div className="font-semibold">{fmtValue(m, x.p50)}</div>
                                                        <div className="text-[10px] text-grey">p10–p90: {fmtValue(m, x.p10)} → {fmtValue(m, x.p90)}</div>
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
            </Card>

            {/* Quick links */}
            {selectedWeekId && (
                <p className="text-xs text-grey">
                    Quick:{" "}
                    <Link to={`/baseline-weeks/${selectedWeekId}/grid`} className="text-deep-blue hover:underline">edit baseline</Link> ·{" "}
                    <Link to={`/baseline-weeks/${selectedWeekId}/dashboard`} className="text-deep-blue hover:underline">open dashboard</Link> ·{" "}
                    <Link to={`/simulation?weekId=${selectedWeekId}`} className="text-deep-blue hover:underline">simulation</Link>
                </p>
            )}
        </div>
    );
}