import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek, Scenario, SimulationResponse, MetricSummary } from "../api/types";
import { fmtValue, niceKey } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { useSimDefaults } from "../hooks/useSimDefaults";

function getMetric(result: SimulationResponse | null, key: string): MetricSummary | null {
    if (!result) return null;
    return (result.result.metrics[key] as MetricSummary) ?? null;
}

export default function SimulationPage() {
    const [sp, setSp] = useSearchParams();
    const weekIdFromUrl = sp.get("weekId") ? Number(sp.get("weekId")) : null;

    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<number | null>(weekIdFromUrl);
    const baselineWeekId = selectedWeekId;

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loadingScenarios, setLoadingScenarios] = useState(false);

    const { runs, setRuns, seed, setSeed } = useSimDefaults();
    const [error, setError] = useState<string | null>(null);
    const [runningKey, setRunningKey] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, SimulationResponse>>({});

    // Load available weeks so user can pick one
    useEffect(() => {
        api.listWeeks().then((w) => {
            setWeeks(w);
            if (!selectedWeekId && w.length > 0) {
                const first = w[0].id;
                setSelectedWeekId(first);
                setSp({ weekId: String(first) }, { replace: true });
            }
        }).catch((e) => setError(`Failed to load weeks: ${e}`));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load scenarios when week changes
    useEffect(() => {
        if (selectedWeekId == null) return;
        setLoadingScenarios(true);
        setScenarios([]);
        api.listScenarios(selectedWeekId)
            .then((sc) => setScenarios(sc))
            .catch(() => setScenarios([]))
            .finally(() => setLoadingScenarios(false));
    }, [selectedWeekId]);

    function changeWeek(id: number) {
        setSelectedWeekId(id);
        setSp({ weekId: String(id) }, { replace: true });
        setResults({});
        setError(null);
    }

    async function runScenario(s: Scenario) {
        if (!baselineWeekId || Number.isNaN(baselineWeekId)) {
            setError("Missing weekId. Select a baseline week first.");
            return;
        }
        setRunningKey(s.id);
        setError(null);
        try {
            const json = await api.runSimulation({
                baseline_week_id: baselineWeekId, runs,
                seed: seed === "" ? null : Number(seed),
                overrides: s.params,
            });
            setResults((prev) => ({ ...prev, [s.id]: json }));
        } catch (e) {
            setError(String(e));
        } finally {
            setRunningKey(null);
        }
    }

    async function runAll() {
        if (!baselineWeekId || Number.isNaN(baselineWeekId)) {
            setError("Missing weekId. Select a baseline week first.");
            return;
        }
        setError(null);
        for (const s of scenarios) {
            setRunningKey(s.id);
            try {
                const json = await api.runSimulation({
                    baseline_week_id: baselineWeekId, runs,
                    seed: seed === "" ? null : Number(seed),
                    overrides: s.params,
                });
                setResults((prev) => ({ ...prev, [s.id]: json }));
            } catch (e) { setError(String(e)); break; }
        }
        setRunningKey(null);
    }

    const compareKeys = [
        "finance.revenue", "finance.profit", "demand.served_groups", "demand.lost_groups",
        "queue.wait_table", "queue.wait_food", "util.kitchen", "util.tables",
    ];



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
                            <label className="block text-xs font-medium text-grey mb-1">Baseline Week</label>
                            <select
                                value={baselineWeekId ?? ""}
                                onChange={(e) => changeWeek(Number(e.target.value))}
                                className="!w-48"
                            >
                                {weeks.length === 0 && <option value="">Loading…</option>}
                                {weeks.map((w) => (
                                    <option key={w.id} value={w.id}>#{w.id} — {w.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">Runs</label>
                        <input type="number" value={runs} onChange={(e) => setRuns(Number(e.target.value))} min={10} max={5000} className="!w-24" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">Seed</label>
                        <input type="number" value={seed} onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))} placeholder="42" className="!w-24" />
                    </div>
                    <Button onClick={runAll} disabled={runningKey !== null || scenarios.length === 0}>
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

            {/* Empty state */}
            {!loadingScenarios && scenarios.length === 0 && (
                <Card className="p-8 text-center mb-6">
                    <div className="text-3xl mb-3">🔬</div>
                    <p className="text-sm text-grey mb-2">No scenarios found for this week.</p>
                    <p className="text-xs text-grey mb-4">Create scenarios in the Scenarios page for this baseline week first.</p>
                    {baselineWeekId && (
                        <Link to={`/baseline-weeks/${baselineWeekId}/scenarios`} className="inline-flex items-center gap-1.5 text-sm text-deep-blue hover:underline font-medium">
                            → Create Scenarios
                        </Link>
                    )}
                </Card>
            )}

            {loadingScenarios && (
                <div className="flex items-center justify-center gap-2 py-8">
                    <div className="w-5 h-5 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                    <span className="text-sm text-grey">Loading scenarios…</span>
                </div>
            )}

            {/* Scenario cards */}
            {scenarios.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {scenarios.map((s) => {
                        const done = !!results[s.id];
                        return (
                            <Card key={s.id} className={`p-5 group hover:scale-[1.02] transition-all duration-200 ${done ? "ring-1 ring-algae-dark/30" : ""}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">🧪</span>
                                    <div>
                                        <div className="font-bold text-sm text-mariana">{s.name}</div>
                                        <div className="text-[10px] text-grey font-mono">id: {s.id}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={() => runScenario(s)} disabled={runningKey !== null}>
                                        {runningKey === s.id ? (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Running…
                                            </span>
                                        ) : "▶ Run"}
                                    </Button>
                                    {done && <span className="text-xs text-algae-dark font-medium">✓ {results[s.id].result.runs} runs</span>}
                                </div>
                                {/* Mini results preview */}
                                {done && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {["finance.revenue", "finance.profit"].map((mk) => {
                                            const r = getMetric(results[s.id], mk);
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
                                <details className="mt-2">
                                    <summary className="text-xs text-grey cursor-pointer hover:text-mariana transition">Overrides</summary>
                                    <pre className="mt-1 bg-white rounded-lg p-2 text-[10px] overflow-x-auto border border-mist-dark/20">{JSON.stringify(s.params, null, 2)}</pre>
                                </details>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Comparison table */}
            {scenarios.length > 0 && (
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
                                    {scenarios.map((s) => <th key={s.id} className="text-right">{s.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {compareKeys.map((m) => (
                                    <tr key={m}>
                                        <td className="!pl-5 font-mono text-xs">{niceKey(m)}</td>
                                        {scenarios.map((s) => {
                                            const r = getMetric(results[s.id] ?? null, m);
                                            if (!r) return <td key={s.id} className="text-right text-grey">—</td>;
                                            return (
                                                <td key={s.id} className="text-right">
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
                    <p className="px-5 py-3 text-[10px] text-grey">Run scenarios first to populate compare table.</p>
                </Card>
            )}

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