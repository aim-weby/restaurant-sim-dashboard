import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineCell, DataHealthResponse, InsightItem, KpisResponse } from "../api/types";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    AreaChart,
    Area,
    Legend,
    RadialBarChart,
    RadialBar,
    ComposedChart,
    Line,
} from "recharts";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHART_BLUE = "#0000FF";
const CHART_GREEN = "#04FF87";
const CHART_BLUE_LIGHT = "#6366f1";

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}
function fmtPercent(v: number) { return `${(v * 100).toFixed(1)} %`; }
function n(v: any, fallback = 0) { const x = Number(v); return Number.isFinite(x) ? x : fallback; }
function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }
function median(values: number[]) {
    if (values.length === 0) return 0;
    const v = [...values].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }

/* ── Custom tooltip for modern look ── */
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-mariana/95 backdrop-blur-md text-white text-xs rounded-xl px-4 py-3 shadow-xl border border-white/10">
            <div className="font-semibold mb-1.5">{label}</div>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-4 items-center">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        {p.name ?? p.dataKey}
                    </span>
                    <span className="font-mono font-bold">{typeof p.value === "number" && p.value > 100 ? fmtCurrency(p.value) : p.value}</span>
                </div>
            ))}
        </div>
    );
}

type ScenarioLite = { id: number; baseline_week_id: number; name: string; created_at?: string; params: any };
type MetricSummary = { mean: number; p10: number; p50: number; p90: number };
type SimulationResponseLite = {
    baseline_week_id: number; week_start: string; overrides?: any;
    result: { runs: number; metrics: Record<string, MetricSummary>; assumptions: Record<string, any> };
};

/* ── KPI Card with mini-bar sparkline ── */
function KpiCard({ label, value, subtext, icon, bars, color = "blue" }: { label: string; value: string; subtext?: string; icon: string; bars?: number[]; color?: "blue" | "green" | "amber" | "indigo" }) {
    const colorMap = { blue: "from-deep-blue to-blue-700", green: "from-emerald-500 to-green-600", amber: "from-amber-500 to-orange-600", indigo: "from-indigo-500 to-violet-600" };
    const barColorMap = { blue: "bg-deep-blue/30", green: "bg-green-500/30", amber: "bg-amber-500/30", indigo: "bg-indigo-500/30" };
    const barActiveMap = { blue: "bg-deep-blue", green: "bg-green-500", amber: "bg-amber-500", indigo: "bg-indigo-500" };
    return (
        <Card className="p-4 group hover:scale-[1.02] transition-transform duration-200">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-grey uppercase tracking-wider font-medium">{label}</div>
                    <div className="text-xl font-extrabold text-mariana mt-1 truncate">{value}</div>
                    {subtext && <div className="text-[10px] text-grey mt-0.5">{subtext}</div>}
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white text-sm flex-shrink-0 shadow-lg`}>
                    {icon}
                </div>
            </div>
            {bars && bars.length > 0 && (
                <div className="flex items-end gap-0.5 mt-3 h-6">
                    {bars.map((b, i) => {
                        const max = Math.max(...bars, 1);
                        const h = Math.max(4, (b / max) * 24);
                        return <div key={i} className={`flex-1 rounded-sm transition-all duration-300 ${i === bars.length - 1 ? barActiveMap[color] : barColorMap[color]}`} style={{ height: h }} />;
                    })}
                </div>
            )}
        </Card>
    );
}

export default function DashboardPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    const [kpis, setKpis] = useState<KpisResponse | null>(null);
    const [grid, setGrid] = useState<BaselineCell[]>([]);
    const [dayparts, setDayparts] = useState<{ id: number; label: string; sort_order?: number }[]>([]);

    const [scenarios, setScenarios] = useState<ScenarioLite[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
    const [scenarioRun, setScenarioRun] = useState<SimulationResponseLite | null>(null);

    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState<number | "">(42);

    const [health, setHealth] = useState<DataHealthResponse | null>(null);

    const [aiOpen, setAiOpen] = useState(false);
    const [aiInsights, setAiInsights] = useState<InsightItem[]>([]);
    const [aiBusy, setAiBusy] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(week)) return;
        async function load() {
            setLoading(true); setError(null);
            try {
                const [k, g, dp, sc, h] = await Promise.all([
                    api.getKpis(week), api.getBaselineData(week), api.listDayparts(),
                    api.listScenarios(week), api.getHealth(week),
                ]);
                setKpis(k); setGrid(g);
                setDayparts(dp.map((d: any) => ({ id: d.id, label: d.label, sort_order: d.sort_order })));
                setScenarios(sc as any); setHealth(h);
                const first = (sc as any[])?.[0]?.id;
                if (first && selectedScenarioId === null) setSelectedScenarioId(first);
            } catch (e) { console.error("Dashboard load error:", e); setError(String(e)); }
            finally { setLoading(false); }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [week]);

    const daypartsSorted = useMemo(() => [...dayparts].sort((a, b) => n(a.sort_order, 0) - n(b.sort_order, 0)), [dayparts]);

    const revenueByWeekday = useMemo(() => {
        const sums = Array.from({ length: 7 }, () => ({ revenue: 0, groups: 0, avgSpend: 0 }));
        for (const c of grid) {
            const rev = n(c.arrivals_groups) * n((c as any).avg_spend_per_group);
            sums[c.weekday].revenue += rev;
            sums[c.weekday].groups += n(c.arrivals_groups);
        }
        for (let i = 0; i < 7; i++) {
            const g = sums[i].groups;
            sums[i].avgSpend = g > 0 ? sums[i].revenue / g : 0;
        }
        return sums.map((x, i) => ({ weekday: WEEKDAYS[i], revenue: Math.round(x.revenue), groups: Math.round(x.groups), avgSpend: Math.round(x.avgSpend) }));
    }, [grid]);

    const heatmap = useMemo(() => {
        const dpIds = daypartsSorted.map((d) => d.id);
        const m = Array.from({ length: 7 }, () => dpIds.map(() => 0));
        for (const c of grid) { const j = dpIds.indexOf(c.daypart_id); if (j >= 0) m[c.weekday][j] = n(c.arrivals_groups); }
        const max = Math.max(1, ...m.flat());
        return { m, max };
    }, [grid, daypartsSorted]);

    const cellStats = useMemo(() => {
        const totalCells = 7 * Math.max(1, daypartsSorted.length);
        const filled = grid.filter((c) => n(c.arrivals_groups) > 0 || n((c as any).avg_spend_per_group) > 0).length;
        const arrivalsList = grid.map((c) => n(c.arrivals_groups));
        const spendList = grid.map((c) => n((c as any).avg_spend_per_group)).filter((x) => x > 0);
        const totalGroups = sum(arrivalsList);
        const coverage = totalCells > 0 ? filled / totalCells : 0;
        return { totalCells, filled, coverage, totalGroups, spendMin: spendList.length ? Math.min(...spendList) : 0, spendMax: spendList.length ? Math.max(...spendList) : 0, spendMedian: spendList.length ? median(spendList) : 0 };
    }, [grid, daypartsSorted]);

    const bestCells = useMemo(() => {
        if (daypartsSorted.length === 0) return null;
        let best: { weekday: number; daypartId: number; groups: number } | null = null;
        for (const c of grid) { const g = n(c.arrivals_groups); if (!best || g > best.groups) best = { weekday: c.weekday, daypartId: c.daypart_id, groups: g }; }
        const byWd = Array.from({ length: 7 }, () => 0);
        for (const c of grid) byWd[c.weekday] += n(c.arrivals_groups);
        const bestWeekdayIdx = byWd.indexOf(Math.max(...byWd));
        const dpIds = daypartsSorted.map((d) => d.id);
        const byDp = dpIds.map(() => 0);
        for (const c of grid) { const j = dpIds.indexOf(c.daypart_id); if (j >= 0) byDp[j] += n(c.arrivals_groups); }
        const bestDaypartIdx = byDp.indexOf(Math.max(...byDp));
        const daypartLabel = (id: number) => daypartsSorted.find((d) => d.id === id)?.label ?? `#${id}`;
        return {
            peak: best ? { weekday: WEEKDAYS[best.weekday], daypart: daypartLabel(best.daypartId), groups: best.groups } : null,
            bestWeekday: { weekday: WEEKDAYS[bestWeekdayIdx], groups: byWd[bestWeekdayIdx] },
            bestDaypart: { daypart: daypartsSorted[bestDaypartIdx]?.label ?? "—", groups: byDp[bestDaypartIdx] ?? 0 },
            byWd,
        };
    }, [grid, daypartsSorted]);

    const k = kpis?.kpis ?? {};
    const revenue = n(k["finance.revenue"]);
    const profit = n(k["finance.profit"]);
    const margin = n(k["finance.profit_margin"]);
    const primeRatio = n(k["finance.prime_cost_ratio"]);
    const laborRatio = n(k["finance.labor_cost_ratio"]);
    const arrivals = n(k["demand.arrivals_groups"]);
    const cogs = n(k["finance.cogs"]);
    const fixedCost = n(k["finance.fixed_cost"]);
    const laborCost = n(k["finance.labor_cost"]);

    const insights = useMemo(() => {
        const lines: { title: string; body: string; tone?: "good" | "warn" | "neutral" }[] = [];
        if (bestCells?.peak) { lines.push({ title: "🔥 Peak demand", body: `${bestCells.peak.weekday} · ${bestCells.peak.daypart}: ${bestCells.peak.groups.toFixed(0)} groups`, tone: "good" }); }
        const weekendGroups = (bestCells?.byWd?.[5] ?? 0) + (bestCells?.byWd?.[6] ?? 0);
        const totalGroups = cellStats.totalGroups;
        if (totalGroups > 0) { lines.push({ title: "📊 Weekend share", body: `${pct(weekendGroups / totalGroups)} of weekly groups happen on Sat+Sun`, tone: "neutral" }); }
        if (cellStats.spendMedian > 0) { lines.push({ title: "💰 Avg spend range", body: `${Math.round(cellStats.spendMin)} → ${Math.round(cellStats.spendMax)} CZK (median ${Math.round(cellStats.spendMedian)} CZK)`, tone: "neutral" }); }
        if (margin > 0) { lines.push({ title: margin >= 0.15 ? "✅ Profit margin" : "⚠️ Profit margin", body: `${fmtPercent(margin)} — ${margin >= 0.15 ? "healthy baseline" : "tight, watch prime cost"}`, tone: margin >= 0.15 ? "good" : "warn" }); }
        if (primeRatio > 0) { lines.push({ title: primeRatio <= 0.60 ? "✅ Prime cost ratio" : "⚠️ Prime cost ratio", body: `${fmtPercent(primeRatio)} — ${primeRatio <= 0.60 ? "within target" : "high (labor+COGS heavy)"}`, tone: primeRatio <= 0.60 ? "good" : "warn" }); }
        if (health) {
            const cov = health.coverage_score;
            const okChecks = health.checks.filter(c => c.status === "ok").length;
            lines.push({ title: cov >= 80 ? "✅ Data health" : "⚠️ Data health", body: `Coverage ${cov}% · ${okChecks}/${health.checks.length} checks OK · Actionability: ${health.actionability_score}/100`, tone: cov >= 80 ? "good" : "warn" });
        } else {
            const cov = cellStats.coverage;
            lines.push({ title: "📋 Data health", body: `${Math.round(cov * 100)}% cell coverage (${cellStats.filled}/${cellStats.totalCells} cells).`, tone: cov >= 0.8 ? "good" : "warn" });
        }
        return lines.slice(0, 8);
    }, [bestCells, cellStats, margin, primeRatio, health]);

    // Scenario delta helpers
    function simP50(metricKey: string) { const r = scenarioRun?.result.metrics?.[metricKey]; return r ? n(r.p50) : null; }
    const scenarioDelta = useMemo(() => {
        const p50Profit = simP50("finance.profit"); const p50Revenue = simP50("finance.revenue");
        const p50Lost = simP50("demand.lost_groups"); const p50Cogs = simP50("finance.cogs");
        return {
            profit: p50Profit === null ? null : { base: profit, scen: p50Profit, delta: p50Profit - profit },
            revenue: p50Revenue === null ? null : { base: revenue, scen: p50Revenue, delta: p50Revenue - revenue },
            cogs: p50Cogs === null ? null : { base: cogs, scen: p50Cogs, delta: p50Cogs - cogs },
            lost: p50Lost === null ? null : { base: 0, scen: p50Lost, delta: p50Lost - 0 },
        };
    }, [scenarioRun, profit, revenue, cogs]);

    async function runSelectedScenario() {
        if (!selectedScenarioId) { setError("Select a scenario first."); return; }
        setError(null);
        try {
            setScenarioRun(null);
            const res = await api.runScenario(selectedScenarioId, { runs, seed: seed === "" ? null : Number(seed) });
            setScenarioRun(res as any);
            if (aiOpen) setAiInsights([]);
        } catch (e) { setError(String(e)); }
    }

    async function onExplain() {
        setAiOpen(true); setAiBusy(true);
        try { const res = await api.getInsights(week); setAiInsights(res.insights); }
        catch (e) { setAiInsights([{ id: "error", category: "data", severity: "warning", text: `Failed to load insights: ${e}` }]); }
        finally { setAiBusy(false); }
    }

    if (!Number.isFinite(week)) return <div className="p-6 text-mariana">Invalid weekId.</div>;
    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
            <span className="text-grey text-sm">Loading dashboard…</span>
        </div>
    );

    const deltaMetrics = [
        { key: "finance.profit", label: "Profit", fmt: fmtCurrency, base: profit, scen: scenarioDelta.profit?.scen ?? null, delta: scenarioDelta.profit?.delta ?? null, icon: "📈" },
        { key: "finance.revenue", label: "Revenue", fmt: fmtCurrency, base: revenue, scen: scenarioDelta.revenue?.scen ?? null, delta: scenarioDelta.revenue?.delta ?? null, icon: "💵" },
        { key: "finance.cogs", label: "COGS", fmt: fmtCurrency, base: cogs, scen: scenarioDelta.cogs?.scen ?? null, delta: scenarioDelta.cogs?.delta ?? null, icon: "📦" },
        { key: "demand.lost_groups", label: "Lost groups", fmt: (x: number) => x.toFixed(2), base: 0, scen: scenarioDelta.lost?.scen ?? null, delta: scenarioDelta.lost?.delta ?? null, icon: "🚶" },
    ];

    /* -- Radial gauge data for margins -- */
    const gaugeData = [
        { name: "Profit margin", value: Math.round(margin * 100), fill: margin >= 0.15 ? "#04FF87" : "#f59e0b" },
        { name: "Prime cost", value: Math.round(primeRatio * 100), fill: primeRatio <= 0.6 ? "#6366f1" : "#ef4444" },
        { name: "Labor ratio", value: Math.round(laborRatio * 100), fill: "#0000FF" },
    ];

    /* -- Cost breakdown data -- */
    const costData = [
        { name: "COGS", value: cogs, fill: "#6366f1" },
        { name: "Labor", value: laborCost, fill: "#0000FF" },
        { name: "Fixed", value: fixedCost, fill: "#04FF87" },
    ];
    const totalCost = cogs + laborCost + fixedCost;

    return (
        <div>
            {/* Header */}
            <PageHeader title={`Dashboard · Week #${week}`} subtitle="Overview of baseline performance + demand pattern from your grid.">
                <div className="flex gap-3 flex-wrap text-sm">
                    <Link to="/baseline-weeks" className="text-deep-blue hover:underline">← Weeks</Link>
                    <Link to={`/baseline-weeks/${week}/grid`} className="text-deep-blue hover:underline">Edit grid</Link>
                    <Link to={`/baseline-weeks/${week}/kpis`} className="text-deep-blue hover:underline">KPI detail</Link>
                    <Link to={`/baseline-weeks/${week}/scenarios`} className="text-deep-blue hover:underline">Scenarios</Link>
                    <Link to={`/simulation?weekId=${week}`} className="text-deep-blue hover:underline">Simulation</Link>
                </div>
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <KpiCard label="Revenue" value={fmtCurrency(revenue)} icon="💰" color="blue" bars={revenueByWeekday.map((d) => d.revenue)} />
                <KpiCard label="Profit" value={fmtCurrency(profit)} icon="📈" color="green" bars={revenueByWeekday.map((d) => d.revenue - (cogs + laborCost + fixedCost) / 7)} subtext={`margin ${fmtPercent(margin)}`} />
                <KpiCard label="Profit margin" value={fmtPercent(margin)} icon="📊" color={margin >= 0.15 ? "green" : "amber"} />
                <KpiCard label="Prime cost ratio" value={fmtPercent(primeRatio)} icon="⚙️" color={primeRatio <= 0.6 ? "blue" : "amber"} />
                <KpiCard label="Labor cost ratio" value={fmtPercent(laborRatio)} icon="👷" color="indigo" />
                <KpiCard label="Arrivals (groups)" value={arrivals.toFixed(0)} icon="🚗" color="blue" bars={revenueByWeekday.map((d) => d.groups)} />
            </div>

            {/* Row 2: Revenue chart + Ratio gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Revenue by weekday — Composed chart (area + line) */}
                <Card className="lg:col-span-2 p-5">
                    <h3 className="text-sm font-bold text-mariana">Revenue by weekday</h3>
                    <p className="text-xs text-grey mb-4">Derived: arrivals_groups × avg_spend_per_group</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueByWeekday}>
                                <defs>
                                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="weekday" tick={{ fill: "#9BAAB9", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#9BAAB9", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="revenue" stroke={CHART_BLUE} fill="url(#gradRevenue)" strokeWidth={2.5} name="Revenue" dot={{ fill: CHART_BLUE, r: 4, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }} />
                                <Line type="monotone" dataKey="avgSpend" stroke={CHART_GREEN} strokeWidth={2} strokeDasharray="5 5" name="Avg spend" dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Ratio gauges */}
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-mariana">Key ratios</h3>
                    <p className="text-xs text-grey mb-2">Profit margin, prime cost, labor ratio</p>
                    <div className="h-52 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart innerRadius="30%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0} barSize={14}>
                                <RadialBar background={{ fill: "#f0f2f5" }} dataKey="value" cornerRadius={8} />
                                <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-mariana/95 text-white text-xs rounded-lg px-3 py-2 shadow-lg">{payload[0].payload.name}: <strong>{payload[0].value}%</strong></div> : null} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {gaugeData.map((g) => (
                            <div key={g.name} className="text-center">
                                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: g.fill }} />
                                <div className="text-[10px] text-grey">{g.name}</div>
                                <div className="text-sm font-bold text-mariana">{g.value}%</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Row 3: Cost breakdown bar + Demand area chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Cost breakdown — horizontal stacked bar */}
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-mariana">Cost breakdown</h3>
                    <p className="text-xs text-grey mb-4">Total: {fmtCurrency(totalCost)}</p>
                    <div className="space-y-3">
                        {costData.map((c) => {
                            const pctVal = totalCost > 0 ? c.value / totalCost : 0;
                            return (
                                <div key={c.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-mariana font-medium">{c.name}</span>
                                        <span className="text-grey">{fmtCurrency(c.value)} · {(pctVal * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-mist rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pctVal * 100}%`, background: c.fill }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-mist-dark/10 grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-[10px] text-grey">Revenue</div>
                            <div className="text-sm font-bold text-mariana">{fmtCurrency(revenue)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-grey">Total cost</div>
                            <div className="text-sm font-bold text-mariana">{fmtCurrency(totalCost)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-grey">Profit</div>
                            <div className={`text-sm font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtCurrency(profit)}</div>
                        </div>
                    </div>
                </Card>

                {/* Demand chart — area with gradient */}
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-mariana">Demand pattern</h3>
                    <p className="text-xs text-grey mb-4">Groups per weekday + avg spend trend</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueByWeekday}>
                                <defs>
                                    <linearGradient id="gradGroups" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_BLUE_LIGHT} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_BLUE_LIGHT} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="weekday" tick={{ fill: "#9BAAB9", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#9BAAB9", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend iconType="circle" iconSize={8} />
                                <Area type="monotone" dataKey="groups" stroke={CHART_BLUE_LIGHT} fill="url(#gradGroups)" strokeWidth={2.5} name="Groups" dot={{ fill: CHART_BLUE_LIGHT, r: 4, strokeWidth: 2, stroke: "white" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Row 4: Insights + Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                {/* Insights – 3 col */}
                <Card className="lg:col-span-3 p-5">
                    <div className="flex justify-between items-baseline gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-mariana">Auto insights</h3>
                            <p className="text-xs text-grey">Generated from baseline week grid + KPIs</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onExplain}>{aiBusy ? "Thinking…" : "🤖 Explain"}</Button>
                    </div>
                    <div className="space-y-2">
                        {insights.map((x, idx) => {
                            const bg = x.tone === "good" ? "bg-emerald-50 border-emerald-200" : x.tone === "warn" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200";
                            return (
                                <div key={idx} className={`border rounded-xl p-3 transition-all duration-200 hover:shadow-sm ${bg}`}>
                                    <div className="font-semibold text-sm text-mariana">{x.title}</div>
                                    <div className="text-xs text-mariana/70 mt-0.5 leading-relaxed">{x.body}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* AI insights panel */}
                    {aiOpen && (
                        <div className="mt-4 pt-4 border-t border-mist-dark/10">
                            <h4 className="text-xs font-bold text-mariana mb-2">🤖 Rule-Based Insights</h4>
                            {aiBusy ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                                    <span className="text-xs text-grey">Analyzing…</span>
                                </div>
                            ) : aiInsights.length > 0 ? (
                                <div className="space-y-2">
                                    {aiInsights.map((ins) => {
                                        const badge = ins.severity === "critical" ? "🔴" : ins.severity === "warning" ? "🟡" : ins.severity === "positive" ? "🟢" : "💡";
                                        const bg = ins.severity === "critical" ? "bg-red-50" : ins.severity === "warning" ? "bg-amber-50" : ins.severity === "positive" ? "bg-green-50" : "bg-indigo-50";
                                        return (
                                            <div key={ins.id} className={`${bg} rounded-lg p-2.5 text-xs leading-relaxed`}>
                                                <span className="mr-1.5">{badge}</span>
                                                <span className="font-semibold capitalize text-grey text-[10px]">{ins.category}</span>
                                                <span className="mx-1.5 text-mist-dark">·</span>
                                                <span className="text-mariana/80">{ins.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-grey">No insights available.</p>
                            )}
                            <div className="flex gap-2 mt-3">
                                <Button variant="ghost" size="sm" onClick={onExplain}>Refresh</Button>
                                <Button variant="ghost" size="sm" onClick={() => { setAiOpen(false); setAiInsights([]); }}>Clear</Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Highlights – 2 col */}
                <Card className="lg:col-span-2 p-5">
                    <h3 className="text-sm font-bold text-mariana mb-1">Quick highlights</h3>
                    <p className="text-xs text-grey mb-4">Best day / daypart + coverage</p>

                    <div className="space-y-3">
                        {[
                            { emoji: "📅", label: "Best weekday", value: bestCells?.bestWeekday.weekday ?? "—", sub: bestCells ? `${bestCells.bestWeekday.groups.toFixed(0)} groups` : "—" },
                            { emoji: "🍽️", label: "Best daypart", value: bestCells?.bestDaypart.daypart ?? "—", sub: bestCells ? `${bestCells.bestDaypart.groups.toFixed(0)} groups` : "—" },
                            { emoji: "🔥", label: "Peak cell", value: bestCells?.peak ? `${bestCells.peak.weekday} · ${bestCells.peak.daypart}` : "—", sub: bestCells?.peak ? `${bestCells.peak.groups.toFixed(0)} groups` : "—" },
                        ].map((h) => (
                            <div key={h.label} className="flex items-center gap-3 bg-gradient-to-r from-mist/40 to-transparent rounded-xl p-3">
                                <span className="text-xl">{h.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-grey uppercase tracking-wider">{h.label}</div>
                                    <div className="text-sm font-bold text-mariana truncate">{h.value}</div>
                                    <div className="text-[10px] text-grey">{h.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Coverage gauge */}
                    <div className="mt-4 pt-4 border-t border-mist-dark/10">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-grey">Grid coverage</span>
                            <span className="font-bold text-mariana">{Math.round(cellStats.coverage * 100)}% ({cellStats.filled}/{cellStats.totalCells})</span>
                        </div>
                        <div className="w-full h-2.5 bg-mist rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-deep-blue to-algae transition-all duration-700" style={{ width: `${cellStats.coverage * 100}%` }} />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4 text-xs">
                        <Link to={`/baseline-weeks/${week}/grid`} className="text-deep-blue hover:underline">Improve data →</Link>
                        <Link to={`/baseline-weeks/${week}/scenarios`} className="text-deep-blue hover:underline">Try scenarios →</Link>
                    </div>
                </Card>
            </div>

            {/* Row 5: Scenario Delta */}
            <Card className="p-5 mb-6">
                <div className="flex justify-between items-baseline flex-wrap gap-2 mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-mariana">⚡ Scenario Delta</h3>
                        <p className="text-xs text-grey">Run a saved scenario and see delta vs baseline (p50)</p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        <select value={selectedScenarioId ?? ""} onChange={(e) => setSelectedScenarioId(e.target.value === "" ? null : Number(e.target.value))} className="!w-auto !py-1.5 !text-xs">
                            <option value="">(none)</option>
                            {scenarios.map((s) => <option key={s.id} value={s.id}>#{s.id} · {s.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <input type="number" min={10} max={5000} value={runs} onChange={(e) => setRuns(Number(e.target.value))} className="!w-16 !py-1.5 !text-xs" title="Runs" />
                            <input type="number" value={seed} onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))} placeholder="seed" className="!w-16 !py-1.5 !text-xs" />
                        </div>
                        <Button size="sm" onClick={runSelectedScenario} disabled={!selectedScenarioId}>Run</Button>
                        <Link to={`/baseline-weeks/${week}/scenarios`} className="text-xs text-deep-blue hover:underline">Manage →</Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {deltaMetrics.map((m) => {
                        const has = m.scen !== null && m.delta !== null;
                        const d = has ? Number(m.delta) : 0;
                        const isPositive = d > 0;
                        const isNegative = d < 0;
                        return (
                            <div key={m.key} className="relative overflow-hidden bg-gradient-to-br from-white to-mist/30 rounded-xl p-4 border border-mist-dark/15">
                                <div className="flex justify-between items-start gap-1">
                                    <span className="text-[10px] text-grey uppercase tracking-wider">{m.label}</span>
                                    <span className="text-lg">{m.icon}</span>
                                </div>
                                <div className="text-lg font-extrabold text-mariana mt-1">{has ? m.fmt(Number(m.scen)) : "—"}</div>
                                <div className="text-[10px] text-grey mt-0.5">baseline: {m.fmt(Number(m.base))}</div>
                                {has && (
                                    <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPositive ? "bg-green-100 text-green-700" : isNegative ? "bg-red-100 text-red-700" : "bg-slate-100 text-grey"}`}>
                                        {isPositive ? "▲" : isNegative ? "▼" : "●"} {m.key === "demand.lost_groups" ? d.toFixed(2) : fmtCurrency(Math.abs(d)).replace("Kč", "").trim() + " Kč"}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {scenarioRun && <p className="text-[10px] text-grey mt-3">Last run: {scenarioRun.result.runs} runs completed</p>}
            </Card>

            {/* Heatmap */}
            <Card className="mb-6 overflow-hidden">
                <div className="p-5 pb-0 flex justify-between items-baseline gap-2 flex-wrap">
                    <div>
                        <h3 className="text-sm font-bold text-mariana">🗺️ Arrivals heatmap</h3>
                        <p className="text-xs text-grey">Weekday × daypart — where is demand concentrated?</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-grey">
                        <span>Low</span>
                        <div className="flex gap-0.5">
                            {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0].map((v) => (
                                <div key={v} className="w-4 h-3 rounded-sm" style={{ background: `rgba(99, 102, 241, ${v})` }} />
                            ))}
                        </div>
                        <span>High · max {heatmap.max.toFixed(0)}</span>
                    </div>
                </div>

                {daypartsSorted.length === 0 ? (
                    <p className="p-5 text-sm text-grey">No dayparts. Create dayparts first.</p>
                ) : (
                    <div className="overflow-x-auto p-5 pt-3">
                        <table className="min-w-[700px]">
                            <thead>
                                <tr>
                                    <th className="!bg-transparent">Weekday</th>
                                    {daypartsSorted.map((dp) => <th key={dp.id} className="!bg-transparent">{dp.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmap.m.map((row, i) => (
                                    <tr key={i} className="!hover:bg-transparent">
                                        <td className="font-semibold !border-0 !py-1.5">{WEEKDAYS[i]}</td>
                                        {row.map((v, j) => {
                                            const intensity = Math.max(0.06, v / heatmap.max);
                                            return (
                                                <td key={j} title={`${v.toFixed(0)} groups`}
                                                    className="text-center font-bold !border-0 !py-1.5 !px-1">
                                                    <div className="rounded-lg py-2 px-3 transition-all duration-200"
                                                        style={{ background: `rgba(99, 102, 241, ${intensity * 0.7})`, color: intensity > 0.5 ? "white" : "#0F232E" }}>
                                                        {v ? v.toFixed(0) : "—"}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}