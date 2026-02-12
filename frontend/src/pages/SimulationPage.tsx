import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { SimulationResponse } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

type MetricSummary = { mean: number; p10: number; p50: number; p90: number; median: number };
type Scenario = { key: string; name: string; overrides: any };

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v: number) { return v.toFixed(1); }
function fmtValue(metric: string, v: number) {
    if (metric.startsWith("finance.")) return fmtCurrency(v);
    if (metric.startsWith("util.")) return `${(v * 100).toFixed(1)} %`;
    if (metric.startsWith("queue.") || metric.startsWith("time.")) return `${fmtNum(v)} min`;
    return fmtNum(v);
}

function getMetric(result: SimulationResponse | null, key: string): MetricSummary | null {
    if (!result) return null;
    return (result.result.metrics[key] as MetricSummary) ?? null;
}

const SCENARIO_ICONS: Record<string, string> = {
    baseline: "📋",
    sat_dinner_plus1_kitchen: "👨‍🍳",
    price_plus8: "💲",
    add_tables: "🪑",
};

export default function SimulationPage() {
    const [sp] = useSearchParams();
    const baselineWeekId = sp.get("weekId") ? Number(sp.get("weekId")) : null;

    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState<number | "">(42);
    const [error, setError] = useState<string | null>(null);
    const [runningKey, setRunningKey] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, SimulationResponse>>({});

    const scenarios: Scenario[] = useMemo(() => [
        { key: "baseline", name: "Baseline", overrides: { staffing_changes: [], price_change: null, capacity_changes: null, opening_hours_changes: [], arrivals_multiplier: 1.0, spend_multiplier: 1.0 } },
        { key: "sat_dinner_plus1_kitchen", name: "+1 Kitchen (Sat Dinner)", overrides: { staffing_changes: [{ weekday: 5, daypart_id: 2, role: "kitchen", delta_staff: 1 }], price_change: null, capacity_changes: null, opening_hours_changes: [], arrivals_multiplier: 1.0, spend_multiplier: 1.0 } },
        { key: "price_plus8", name: "Price +8%", overrides: { staffing_changes: [], price_change: { type: "percent", value: 0.08 }, capacity_changes: null, opening_hours_changes: [], arrivals_multiplier: 1.0, spend_multiplier: 1.05 } },
        { key: "add_tables", name: "+4 Seats", overrides: { staffing_changes: [], price_change: null, capacity_changes: { tables_count: 1, seats_total: 4 }, opening_hours_changes: [], arrivals_multiplier: 1.0, spend_multiplier: 1.0 } },
    ], []);

    async function runScenario(s: Scenario) {
        if (!baselineWeekId || Number.isNaN(baselineWeekId)) {
            setError("Missing weekId. Open simulation from a baseline week.");
            return;
        }
        setRunningKey(s.key);
        setError(null);
        try {
            const json = await api.runSimulation({
                baseline_week_id: baselineWeekId, runs,
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

    async function runAll() {
        if (!baselineWeekId || Number.isNaN(baselineWeekId)) {
            setError("Missing weekId. Open simulation from a baseline week.");
            return;
        }
        setError(null);
        for (const s of scenarios) {
            setRunningKey(s.key);
            try {
                const json = await api.runSimulation({
                    baseline_week_id: baselineWeekId, runs,
                    seed: seed === "" ? null : Number(seed),
                    overrides: s.overrides,
                });
                setResults((prev) => ({ ...prev, [s.key]: json }));
            } catch (e) { setError(String(e)); break; }
        }
        setRunningKey(null);
    }

    const compareKeys = [
        "finance.revenue", "finance.profit", "demand.served_groups", "demand.lost_groups",
        "queue.wait_table", "queue.wait_food", "util.kitchen", "util.tables",
    ];

    function niceKey(k: string) {
        return k.split(".").pop()?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? k;
    }

    const completedCount = Object.keys(results).length;

    return (
        <div>
            <PageHeader title="Simulation – Scenario Compare" subtitle={`Baseline week #${baselineWeekId ?? "none"}. Run scenarios to compare KPIs.`}>
                {baselineWeekId && (
                    <Link to={`/baseline-weeks/${baselineWeekId}/dashboard`} className="text-sm text-deep-blue hover:underline">← Dashboard</Link>
                )}
            </PageHeader>

            {/* Controls */}
            <Card className="p-5 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-deep-blue to-indigo-600 flex items-center justify-center text-white text-sm shadow-lg shadow-deep-blue/20">🎛️</div>
                        <div>
                            <label className="block text-xs font-medium text-grey mb-1">Runs</label>
                            <input type="number" value={runs} onChange={(e) => setRuns(Number(e.target.value))} min={10} max={5000} className="!w-24" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">Seed</label>
                        <input type="number" value={seed} onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))} placeholder="42" className="!w-24" />
                    </div>
                    <Button onClick={runAll} disabled={runningKey !== null}>
                        {runningKey !== null ? (
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Running all…
                            </span>
                        ) : "▶ Run All"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResults({})}>Clear Results</Button>
                    {completedCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-algae-dark font-medium">
                            <span className="w-2 h-2 rounded-full bg-algae-dark" />
                            {completedCount}/{scenarios.length} completed
                        </span>
                    )}
                </div>
            </Card>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {/* Scenario cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {scenarios.map((s) => {
                    const done = !!results[s.key];
                    return (
                        <Card key={s.key} className={`p-5 group hover:scale-[1.02] transition-all duration-200 ${done ? "ring-1 ring-algae-dark/30" : ""}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">{SCENARIO_ICONS[s.key] ?? "🧪"}</span>
                                <div>
                                    <div className="font-bold text-sm text-mariana">{s.name}</div>
                                    <div className="text-[10px] text-grey font-mono">{s.key}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => runScenario(s)} disabled={runningKey !== null}>
                                    {runningKey === s.key ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Running…
                                        </span>
                                    ) : "▶ Run"}
                                </Button>
                                {done && <span className="text-xs text-algae-dark font-medium">✓ {results[s.key].result.runs} runs</span>}
                            </div>
                            {/* Mini results preview */}
                            {done && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {["finance.revenue", "finance.profit"].map((mk) => {
                                        const r = getMetric(results[s.key], mk);
                                        if (!r) return null;
                                        return (
                                            <div key={mk} className="bg-mist/30 rounded-lg p-2 text-center">
                                                <div className="text-[10px] text-grey">{niceKey(mk)}</div>
                                                <div className="text-xs font-bold text-mariana">{fmtValue(mk, r.mean)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Comparison table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-0 flex items-center gap-2">
                    <svg className="w-4 h-4 text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-7.5" /></svg>
                    <h3 className="text-sm font-bold text-mariana">Comparison Table</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="!pl-5">Metric</th>
                                {scenarios.map((s) => <th key={s.key} className="text-right">{s.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {compareKeys.map((m) => (
                                <tr key={m}>
                                    <td className="!pl-5 font-mono text-xs">{niceKey(m)}</td>
                                    {scenarios.map((s) => {
                                        const r = getMetric(results[s.key] ?? null, m);
                                        if (!r) return <td key={s.key} className="text-right text-grey">—</td>;
                                        return (
                                            <td key={s.key} className="text-right">
                                                <div className="font-semibold">{fmtValue(m, r.mean)}</div>
                                                <div className="text-[10px] text-grey">
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
            </Card>

            {/* Raw JSON */}
            {Object.keys(results).length > 0 && (
                <details className="mt-5">
                    <summary className="text-sm text-grey cursor-pointer hover:text-mariana transition flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                        View raw JSON
                    </summary>
                    <pre className="mt-2 bg-white rounded-card p-4 text-xs overflow-x-auto border border-mist-dark/30">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
}