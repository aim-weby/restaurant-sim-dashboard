import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineCell, BaselineKpisResponse } from "../api/types";
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
    }).format(v);
}
function fmtPercent(v: number) {
    return `${(v * 100).toFixed(1)} %`;
}
function n(v: any, fallback = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
}
function sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
}
function median(values: number[]) {
    if (values.length === 0) return 0;
    const v = [...values].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
function pct(v: number) {
    return `${(v * 100).toFixed(0)}%`;
}
function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function cardStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.75)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}
function sectionStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 18,
        padding: 14,
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}

function pill(delta: number) {
    const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
    const color = delta > 0 ? "rgba(0,180,90,0.18)" : delta < 0 ? "rgba(255,60,60,0.16)" : "rgba(0,0,0,0.06)";
    const border = delta > 0 ? "rgba(0,180,90,0.35)" : delta < 0 ? "rgba(255,60,60,0.35)" : "rgba(0,0,0,0.10)";
    return { sign, color, border };
}

type ScenarioLite = {
    id: number;
    baseline_week_id: number;
    name: string;
    created_at?: string;
    params: any;
};

type MetricSummary = { mean: number; p10: number; p50: number; p90: number };
type SimulationResponseLite = {
    baseline_week_id: number;
    week_start: string;
    overrides?: any;
    result: {
        runs: number;
        metrics: Record<string, MetricSummary>;
        assumptions: Record<string, any>;
    };
};

export default function DashboardPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    const [kpis, setKpis] = useState<BaselineKpisResponse | null>(null);
    const [grid, setGrid] = useState<BaselineCell[]>([]);
    const [dayparts, setDayparts] = useState<{ id: number; label: string; sort_order?: number }[]>([]);

    // scenarios + delta panel
    const [scenarios, setScenarios] = useState<ScenarioLite[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
    const [scenarioRun, setScenarioRun] = useState<SimulationResponseLite | null>(null);

    // run settings for scenario run directly from dashboard
    const [runs, setRuns] = useState(300);
    const [seed, setSeed] = useState<number | "">(42);
    const [arrivalsSigma, setArrivalsSigma] = useState(0.2);
    const [spendSigma, setSpendSigma] = useState(0.1);

    // AI mock panel
    const [aiOpen, setAiOpen] = useState(false);
    const [aiText, setAiText] = useState<string | null>(null);
    const [aiBusy, setAiBusy] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const headerBg: React.CSSProperties = {
        background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(0,153,255,0.22), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(255,0,122,0.16), transparent 55%)",
        borderRadius: 20,
        padding: 18,
        border: "1px solid rgba(255,255,255,0.3)",
    };

    useEffect(() => {
        if (!Number.isFinite(week)) return;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [k, g, dp, sc] = await Promise.all([
                    api.getBaselineKpis(week),
                    api.getBaselineData(week),
                    api.listDayparts(),
                    api.listScenarios(week), // ✅ už používáš ve ScenariosPage
                ]);

                setKpis(k);
                setGrid(g);
                setDayparts(dp.map((d: any) => ({ id: d.id, label: d.label, sort_order: d.sort_order })));
                setScenarios(sc as any);

                // default scenario selection
                const first = (sc as any[])?.[0]?.id;
                if (first && selectedScenarioId === null) setSelectedScenarioId(first);
            } catch (e) {
                console.error("Dashboard load error:", e);
                setError(String(e));
            } finally {
                setLoading(false);
            }
        }

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [week]);

    const daypartsSorted = useMemo(() => {
        return [...dayparts].sort((a, b) => n(a.sort_order, 0) - n(b.sort_order, 0));
    }, [dayparts]);

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

        return sums.map((x, i) => ({
            weekday: WEEKDAYS[i],
            revenue: Math.round(x.revenue),
            groups: x.groups,
            avgSpend: Math.round(x.avgSpend),
        }));
    }, [grid]);

    const heatmap = useMemo(() => {
        const dpIds = daypartsSorted.map((d) => d.id);
        const m = Array.from({ length: 7 }, () => dpIds.map(() => 0));

        for (const c of grid) {
            const j = dpIds.indexOf(c.daypart_id);
            if (j >= 0) m[c.weekday][j] = n(c.arrivals_groups);
        }

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

        return {
            totalCells,
            filled,
            coverage,
            totalGroups,
            spendMin: spendList.length ? Math.min(...spendList) : 0,
            spendMax: spendList.length ? Math.max(...spendList) : 0,
            spendMedian: spendList.length ? median(spendList) : 0,
        };
    }, [grid, daypartsSorted]);

    const bestCells = useMemo(() => {
        if (daypartsSorted.length === 0) return null;

        let best: { weekday: number; daypartId: number; groups: number } | null = null;
        for (const c of grid) {
            const g = n(c.arrivals_groups);
            if (!best || g > best.groups) best = { weekday: c.weekday, daypartId: c.daypart_id, groups: g };
        }

        const byWd = Array.from({ length: 7 }, () => 0);
        for (const c of grid) byWd[c.weekday] += n(c.arrivals_groups);
        const bestWeekdayIdx = byWd.indexOf(Math.max(...byWd));

        const dpIds = daypartsSorted.map((d) => d.id);
        const byDp = dpIds.map(() => 0);
        for (const c of grid) {
            const j = dpIds.indexOf(c.daypart_id);
            if (j >= 0) byDp[j] += n(c.arrivals_groups);
        }
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

        if (bestCells?.peak) {
            lines.push({
                title: "Peak demand",
                body: `${bestCells.peak.weekday} · ${bestCells.peak.daypart}: ${bestCells.peak.groups.toFixed(0)} groups`,
                tone: "good",
            });
        }

        const weekendGroups = (bestCells?.byWd?.[5] ?? 0) + (bestCells?.byWd?.[6] ?? 0);
        const totalGroups = cellStats.totalGroups;
        if (totalGroups > 0) {
            lines.push({
                title: "Weekend share",
                body: `${pct(weekendGroups / totalGroups)} of weekly groups happen on Sat+Sun`,
                tone: "neutral",
            });
        }

        if (cellStats.spendMedian > 0) {
            lines.push({
                title: "Avg spend range",
                body: `${Math.round(cellStats.spendMin)} → ${Math.round(cellStats.spendMax)} CZK (median ${Math.round(cellStats.spendMedian)} CZK)`,
                tone: "neutral",
            });
        }

        if (margin > 0) {
            lines.push({
                title: "Profit margin",
                body: `${fmtPercent(margin)} — ${margin >= 0.15 ? "healthy baseline" : "tight, watch prime cost"}`,
                tone: margin >= 0.15 ? "good" : "warn",
            });
        }

        if (primeRatio > 0) {
            lines.push({
                title: "Prime cost ratio",
                body: `${fmtPercent(primeRatio)} — ${primeRatio <= 0.60 ? "OK" : "high (labor+COGS heavy)"}`,
                tone: primeRatio <= 0.60 ? "good" : "warn",
            });
        }

        const cov = cellStats.coverage;
        lines.push({
            title: "Data health",
            body: `${Math.round(cov * 100)}% coverage (${cellStats.filled}/${cellStats.totalCells} cells). For stronger conclusions, collect 3–4 weeks.`,
            tone: cov >= 0.8 ? "good" : "warn",
        });

        return lines.slice(0, 8);
    }, [bestCells, cellStats, margin, primeRatio]);

    // ---- scenario delta helpers ----
    function simP50(metricKey: string) {
        const r = scenarioRun?.result.metrics?.[metricKey];
        return r ? n(r.p50) : null;
    }

    const scenarioDelta = useMemo(() => {
        const p50Profit = simP50("finance.profit");
        const p50Revenue = simP50("finance.revenue");
        const p50Lost = simP50("demand.lost_groups");
        const p50Cogs = simP50("finance.cogs");

        // baseline from KPI deterministic (fallback to 0 if missing)
        const baseProfit = profit;
        const baseRevenue = revenue;
        const baseLost = 0; // baseline deterministic doesn't compute lost_groups; treat as 0
        const baseCogs = cogs;

        return {
            profit: p50Profit === null ? null : { base: baseProfit, scen: p50Profit, delta: p50Profit - baseProfit },
            revenue: p50Revenue === null ? null : { base: baseRevenue, scen: p50Revenue, delta: p50Revenue - baseRevenue },
            cogs: p50Cogs === null ? null : { base: baseCogs, scen: p50Cogs, delta: p50Cogs - baseCogs },
            lost: p50Lost === null ? null : { base: baseLost, scen: p50Lost, delta: p50Lost - baseLost },
        };
    }, [scenarioRun, profit, revenue, cogs]);

    const selectedScenario = useMemo(() => {
        return scenarios.find((s) => s.id === selectedScenarioId) ?? null;
    }, [scenarios, selectedScenarioId]);

    async function runSelectedScenario() {
        if (!selectedScenarioId) {
            setError("Select a scenario first.");
            return;
        }
        setError(null);

        try {
            setScenarioRun(null);
            const res = await api.runScenario(selectedScenarioId, {
                runs,
                seed: seed === "" ? null : Number(seed),
                arrivals_sigma: clamp(arrivalsSigma, 0, 1),
                spend_sigma: clamp(spendSigma, 0, 1),
            });
            setScenarioRun(res as any);
            // if AI panel open, regenerate mock text with new run
            if (aiOpen) {
                setAiText(null);
            }
        } catch (e) {
            setError(String(e));
        }
    }

    function makeAiMock(): string {
        const name = selectedScenario?.name ?? "Scenario";
        const lines: string[] = [];

        lines.push(`AI (MVP mock) — quick interpretation for "${name}"`);
        lines.push("");

        // Baseline overview
        lines.push(`Baseline revenue: ${fmtCurrency(revenue)} · profit: ${fmtCurrency(profit)} · margin: ${fmtPercent(margin)}.`);
        lines.push(`Prime cost ratio: ${fmtPercent(primeRatio)} (COGS + labor over revenue).`);
        lines.push(`Total groups (KPI): ${arrivals.toFixed(0)}.`);

        // Scenario deltas
        if (!scenarioRun) {
            lines.push("");
            lines.push("No scenario run yet. Click “Run scenario” to generate deltas & uncertainty bands (p10–p90).");
            return lines.join("\n");
        }

        const pProfit = scenarioDelta.profit?.delta ?? 0;
        const pRev = scenarioDelta.revenue?.delta ?? 0;
        const pLost = scenarioDelta.lost?.scen ?? 0;

        lines.push("");
        lines.push("Scenario impact (vs baseline, using p50 / median of simulation):");
        if (scenarioDelta.profit) {
            lines.push(`• Profit: ${fmtCurrency(scenarioDelta.profit.scen)} (${pProfit >= 0 ? "+" : ""}${fmtCurrency(pProfit)})`);
        }
        if (scenarioDelta.revenue) {
            lines.push(`• Revenue: ${fmtCurrency(scenarioDelta.revenue.scen)} (${pRev >= 0 ? "+" : ""}${fmtCurrency(pRev)})`);
        }
        if (scenarioDelta.cogs) {
            const d = scenarioDelta.cogs.delta;
            lines.push(`• COGS: ${fmtCurrency(scenarioDelta.cogs.scen)} (${d >= 0 ? "+" : ""}${fmtCurrency(d)})`);
        }
        lines.push(`• Lost groups (capacity): ${pLost.toFixed(2)} (lower is better)`);

        lines.push("");
        lines.push("Next actions (mock):");
        lines.push("1) If profit ↑ but lost_groups also ↑, consider adding kitchen/service capacity in the peak daypart only.");
        lines.push("2) If revenue ↑ but margin ↓, check food cost % and upsell mix (drinks / high-margin items).");
        lines.push("3) Collect at least 3–4 weeks to validate seasonality and stability.");

        return lines.join("\n");
    }

    async function onExplain() {
        setAiOpen(true);
        setAiBusy(true);
        try {
            // simulate async AI call (frontend mock)
            await new Promise((r) => setTimeout(r, 350));
            setAiText(makeAiMock());
        } finally {
            setAiBusy(false);
        }
    }

    if (!Number.isFinite(week)) return <div style={{ padding: 24 }}>Invalid weekId.</div>;
    if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1300, fontFamily: "system-ui" }}>
            <div style={headerBg}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#666" }}>Baseline week</div>
                        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Dashboard · Week #{week}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>Overview of baseline performance + demand pattern from your grid.</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link to="/baseline-weeks">← Weeks</Link>
                        <Link to={`/baseline-weeks/${week}/grid`}>Edit grid</Link>
                        <Link to={`/baseline-weeks/${week}/kpis`}>KPI detail</Link>
                        <Link to={`/baseline-weeks/${week}/scenarios`}>Scenarios</Link>
                        <Link to={`/simulation?weekId=${week}`}>Simulation</Link>
                    </div>
                </div>
            </div>

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

            {/* KPI cards */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Revenue</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtCurrency(revenue)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtCurrency(profit)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit margin</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(margin)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Prime cost ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(primeRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Labor cost ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(laborRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Arrivals (groups)</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{arrivals.toFixed(0)}</div>
                </div>
            </div>

            {/* Scenario delta + AI panel */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                {/* Scenario delta */}
                <div style={sectionStyle()}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>Scenario Delta</div>
                            <div style={{ color: "#666", fontSize: 12 }}>Run a saved scenario and see delta vs baseline (p50).</div>
                        </div>
                        <div style={{ color: "#666", fontSize: 12 }}>Week #{week}</div>
                    </div>

                    {/* selector + run settings */}
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                Select scenario
                                <select
                                    value={selectedScenarioId ?? ""}
                                    onChange={(e) => setSelectedScenarioId(e.target.value === "" ? null : Number(e.target.value))}
                                    style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                                >
                                    <option value="">(none)</option>
                                    {scenarios.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            #{s.id} · {s.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <button onClick={runSelectedScenario} disabled={!selectedScenarioId} style={{ padding: "10px 12px" }}>
                                    Run scenario
                                </button>
                                <Link to={`/baseline-weeks/${week}/scenarios`}>Manage scenarios →</Link>
                            </div>

                            {scenarioRun && (
                                <div style={{ color: "#666", fontSize: 12 }}>
                                    Last run: runs={scenarioRun.result.runs} · p10–p90 available in raw JSON
                                </div>
                            )}
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>Run settings</div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <label style={{ display: "grid", gap: 6 }}>
                                    Runs
                                    <input
                                        type="number"
                                        min={10}
                                        max={5000}
                                        value={runs}
                                        onChange={(e) => setRuns(Number(e.target.value))}
                                        style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                                    />
                                </label>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Seed (optional)
                                    <input
                                        type="number"
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))}
                                        placeholder="42"
                                        style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                                    />
                                </label>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Arrivals sigma
                                    <input
                                        type="number"
                                        step="0.05"
                                        min={0}
                                        max={1}
                                        value={arrivalsSigma}
                                        onChange={(e) => setArrivalsSigma(Number(e.target.value))}
                                        style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                                    />
                                </label>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Spend sigma
                                    <input
                                        type="number"
                                        step="0.05"
                                        min={0}
                                        max={1}
                                        value={spendSigma}
                                        onChange={(e) => setSpendSigma(Number(e.target.value))}
                                        style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* compare mini panel */}
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        {[
                            { key: "finance.profit", label: "Profit", fmt: fmtCurrency, base: profit, scen: scenarioDelta.profit?.scen ?? null, delta: scenarioDelta.profit?.delta ?? null },
                            { key: "finance.revenue", label: "Revenue", fmt: fmtCurrency, base: revenue, scen: scenarioDelta.revenue?.scen ?? null, delta: scenarioDelta.revenue?.delta ?? null },
                            { key: "finance.cogs", label: "COGS", fmt: fmtCurrency, base: cogs, scen: scenarioDelta.cogs?.scen ?? null, delta: scenarioDelta.cogs?.delta ?? null },
                            { key: "demand.lost_groups", label: "Lost groups", fmt: (x: number) => x.toFixed(2), base: 0, scen: scenarioDelta.lost?.scen ?? null, delta: scenarioDelta.lost?.delta ?? null },
                        ].map((m) => {
                            const has = m.scen !== null && m.delta !== null;
                            const d = has ? Number(m.delta) : 0;
                            const { sign, color, border } = pill(d);

                            return (
                                <div key={m.key} style={cardStyle()}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                                        <div style={{ color: "#666", fontSize: 12 }}>{m.label}</div>
                                        {has ? (
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    padding: "4px 8px",
                                                    borderRadius: 999,
                                                    background: color,
                                                    border: `1px solid ${border}`,
                                                    fontWeight: 800,
                                                }}
                                                title="Scenario p50 - baseline"
                                            >
                                                {sign}
                                                {m.key === "demand.lost_groups" ? d.toFixed(2) : fmtCurrency(d).replace("Kč", "").trim() + " Kč"}
                                            </div>
                                        ) : (
                                            <div style={{ color: "#999", fontSize: 12 }}>—</div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
                                        {has ? m.fmt(Number(m.scen)) : "—"}
                                    </div>

                                    <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                                        baseline: {m.fmt(Number(m.base))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <details style={{ marginTop: 10 }}>
                        <summary>Raw JSON (scenario run)</summary>
                        <pre style={{ background: "#fafafa", padding: 12, borderRadius: 12, overflowX: "auto" }}>
              {JSON.stringify(scenarioRun, null, 2)}
            </pre>
                    </details>
                </div>

                {/* AI mock panel */}
                <div style={sectionStyle()}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>AI Insights (MVP)</div>
                            <div style={{ color: "#666", fontSize: 12 }}>Frontend mock. Later → backend /ai/insights.</div>
                        </div>
                        <button onClick={onExplain} style={{ padding: "8px 12px" }}>
                            {aiBusy ? "Thinking…" : "Explain"}
                        </button>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        <div style={{ color: "#666", fontSize: 12 }}>
                            Selected scenario: <b>{selectedScenario?.name ?? "none"}</b>
                        </div>

                        {!aiOpen ? (
                            <div style={{ color: "#666" }}>
                                Click <b>Explain</b> to get interpretation, weak spots, and suggested next steps.
                            </div>
                        ) : aiText ? (
                            <pre
                                style={{
                                    whiteSpace: "pre-wrap",
                                    background: "rgba(0,0,0,0.03)",
                                    padding: 12,
                                    borderRadius: 14,
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    margin: 0,
                                }}
                            >
                {aiText}
              </pre>
                        ) : (
                            <div style={{ color: "#666" }}>{aiBusy ? "Generating insight…" : "Click Explain."}</div>
                        )}

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                                onClick={() => {
                                    setAiOpen(true);
                                    setAiText(makeAiMock());
                                }}
                                style={{ padding: "8px 10px" }}
                            >
                                Regenerate
                            </button>
                            <button
                                onClick={() => {
                                    setAiOpen(false);
                                    setAiText(null);
                                }}
                                style={{ padding: "8px 10px" }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights + highlights */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                <div style={sectionStyle()}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>Top insights</div>
                            <div style={{ color: "#666", fontSize: 12 }}>Auto-generated from baseline week (grid + KPIs).</div>
                        </div>
                        <div style={{ color: "#666", fontSize: 12 }}>Week #{week}</div>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        {insights.map((x, idx) => {
                            const toneBg =
                                x.tone === "good" ? "rgba(0,180,90,0.10)" :
                                    x.tone === "warn" ? "rgba(255,140,0,0.12)" :
                                        "rgba(0,0,0,0.04)";
                            const toneBorder =
                                x.tone === "good" ? "rgba(0,180,90,0.25)" :
                                    x.tone === "warn" ? "rgba(255,140,0,0.25)" :
                                        "rgba(0,0,0,0.08)";

                            return (
                                <div key={idx} style={{ border: `1px solid ${toneBorder}`, background: toneBg, borderRadius: 14, padding: 12 }}>
                                    <div style={{ fontWeight: 800 }}>{x.title}</div>
                                    <div style={{ color: "#333", marginTop: 4 }}>{x.body}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={sectionStyle()}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Quick highlights</div>
                    <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Best day / daypart + coverage.</div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <div style={cardStyle()}>
                            <div style={{ color: "#666", fontSize: 12 }}>Best weekday</div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{bestCells?.bestWeekday.weekday ?? "—"}</div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                                {bestCells ? `${bestCells.bestWeekday.groups.toFixed(0)} groups` : "—"}
                            </div>
                        </div>

                        <div style={cardStyle()}>
                            <div style={{ color: "#666", fontSize: 12 }}>Best daypart</div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{bestCells?.bestDaypart.daypart ?? "—"}</div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                                {bestCells ? `${bestCells.bestDaypart.groups.toFixed(0)} groups` : "—"}
                            </div>
                        </div>

                        <div style={cardStyle()}>
                            <div style={{ color: "#666", fontSize: 12 }}>Coverage</div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{Math.round(cellStats.coverage * 100)}%</div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                                {cellStats.filled}/{cellStats.totalCells} cells filled
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <Link to={`/baseline-weeks/${week}/grid`}>Improve data →</Link>
                            <Link to={`/baseline-weeks/${week}/scenarios`}>Try scenarios →</Link>
                        </div>

                        <div style={{ marginTop: 6, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10, color: "#666", fontSize: 12 }}>
                            Baseline components: fixed {fmtCurrency(fixedCost)} · labor {fmtCurrency(laborCost)} · COGS {fmtCurrency(cogs)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Revenue by weekday</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Derived: arrivals_groups × avg_spend_per_group.</div>
                    </div>

                    <div style={{ height: 280, marginTop: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByWeekday}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="weekday" />
                                <YAxis />
                                <Tooltip formatter={(v: any, name: any) => (name === "revenue" ? fmtCurrency(n(v)) : v)} />
                                <Legend />
                                <Bar dataKey="revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Demand & avg spend</div>
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
                                <Line type="monotone" dataKey="groups" />
                                <Line type="monotone" dataKey="avgSpend" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Heatmap */}
            <div style={{ marginTop: 14, ...sectionStyle() }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Arrivals heatmap (weekday × daypart)</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Quickly shows where demand is concentrated.</div>
                    </div>

                    <div style={{ color: "#666", fontSize: 12 }}>
                        Max cell: <b>{heatmap.max.toFixed(0)}</b> groups
                    </div>
                </div>

                {daypartsSorted.length === 0 ? (
                    <div style={{ marginTop: 10, color: "#666" }}>No dayparts. Create dayparts first.</div>
                ) : (
                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                        <table cellPadding={10} style={{ borderCollapse: "collapse", minWidth: 900, width: "100%" }}>
                            <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th>Weekday</th>
                                {daypartsSorted.map((dp) => (
                                    <th key={dp.id}>{dp.label}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {heatmap.m.map((row, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f3f3f3" }}>
                                    <td style={{ fontWeight: 700 }}>{WEEKDAYS[i]}</td>
                                    {row.map((v, j) => {
                                        const intensity = Math.max(0.06, v / heatmap.max);
                                        return (
                                            <td
                                                key={j}
                                                title={`${v.toFixed(0)} groups`}
                                                style={{
                                                    borderRadius: 10,
                                                    background: `rgba(0, 153, 255, ${intensity})`,
                                                    color: intensity > 0.55 ? "white" : "#111",
                                                    fontWeight: 700,
                                                    textAlign: "center",
                                                }}
                                            >
                                                {v ? v.toFixed(0) : "—"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}