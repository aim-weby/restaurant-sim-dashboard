import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { Scenario, ScenarioKpisResponse, SimulationResponse, StaffingChange, SimulationOverrides } from "../api/types";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import { fmtCurrency, fmtValue, WEEKDAYS } from "../utils/format";
import { useSimDefaults } from "../hooks/useSimDefaults";

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function defaultOverrides(): SimulationOverrides {
    return { staffing_changes: [], price_change: null, capacity_changes: null, opening_hours_changes: [], arrivals_multiplier: 1.0, spend_multiplier: 1.0, food_cost_pct_override: null, fixed_cost_week_override: null };
}

/* ── Scenario Template Library ── */
type ScenarioTemplate = { emoji: string; name: string; description: string; overrides: Partial<SimulationOverrides> };

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
    {
        emoji: "🔥", name: "Weekend Rush", description: "+20% arrivals, +10% spend on Fri–Sun",
        overrides: { arrivals_multiplier: 1.20, spend_multiplier: 1.10 },
    },
    {
        emoji: "👷", name: "Staff Shortage", description: "−1 kitchen & −1 service on all shifts",
        overrides: {
            staffing_changes: [
                ...Array.from({ length: 7 }, (_, d) => [{ weekday: d, daypart_id: 1, role: "kitchen", delta_staff: -1 }, { weekday: d, daypart_id: 1, role: "service", delta_staff: -1 }]).flat(),
            ] as StaffingChange[],
        },
    },
    {
        emoji: "💸", name: "Price Increase +15%", description: "Raise avg spend by 15%, test elasticity",
        overrides: { spend_multiplier: 1.15 },
    },
    {
        emoji: "📉", name: "Economy Mode", description: "Cut fixed costs 20%, reduce food cost 5pp",
        overrides: { food_cost_pct_override: 0.25 },
    },
    {
        emoji: "🎄", name: "Holiday Season", description: "+30% arrivals, +20% spend across the board",
        overrides: { arrivals_multiplier: 1.30, spend_multiplier: 1.20 },
    },
    {
        emoji: "🌙", name: "Late Night Extended", description: "+15% arrivals, simulate longer hours effect",
        overrides: { arrivals_multiplier: 1.15 },
    },
];

function mergeOverrides(base: SimulationOverrides, partial: Partial<SimulationOverrides>): SimulationOverrides {
    return {
        ...base,
        ...partial,
        staffing_changes: partial.staffing_changes ?? base.staffing_changes,
        opening_hours_changes: partial.opening_hours_changes ?? base.opening_hours_changes,
    };
}



export default function ScenariosPage() {
    const { weekId } = useParams();
    const week = Number(weekId);
    const toast = useToast();

    const [items, setItems] = useState<Scenario[]>([]);
    const [results, setResults] = useState<Record<number, SimulationResponse>>({});
    const [detKpis, setDetKpis] = useState<Record<number, ScenarioKpisResponse>>({});
    const [running, setRunning] = useState<number | null>(null);
    const [runAllRunning, setRunAllRunning] = useState(false);

    const [dayparts, setDayparts] = useState<{ id: number; label: string }[]>([]);
    const [name, setName] = useState("New scenario");
    const [overrides, setOverrides] = useState<SimulationOverrides>(defaultOverrides());

    const [deltaWeekday, setDeltaWeekday] = useState(5);
    const [deltaDaypartId, setDeltaDaypartId] = useState<number | null>(null);
    const [deltaRole, setDeltaRole] = useState<"kitchen" | "service">("kitchen");
    const [deltaCount, setDeltaCount] = useState(1);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [overridesJson, setOverridesJson] = useState(JSON.stringify(defaultOverrides(), null, 2));

    const { runs, setRuns, seed, setSeed } = useSimDefaults();
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);

    async function load() {
        setError(null);
        try {
            const [sc, dp] = await Promise.all([api.listScenarios(week), api.listDayparts()]);
            setItems(sc); setDayparts(dp.map((d) => ({ id: d.id, label: d.label })));
            const kpiMap: Record<number, ScenarioKpisResponse> = {};
            await Promise.all(sc.map(async (s) => { try { kpiMap[s.id] = await api.getScenarioKpis(s.id); } catch { } }));
            setDetKpis(kpiMap);
            if (dp.length > 0 && deltaDaypartId === null) setDeltaDaypartId(dp[0].id);
        } catch (e) { setError(String(e)); }
        finally { setInitialLoading(false); }
    }

    async function runAll() {
        setError(null); setRunAllRunning(true);
        try { for (const s of items) { setRunning(s.id); const res = await api.runScenario(s.id, { runs, seed: seed === "" ? null : Number(seed) }); setResults((prev) => ({ ...prev, [s.id]: res })); } }
        catch (e) { setError(String(e)); }
        finally { setRunning(null); setRunAllRunning(false); }
    }

    useEffect(() => { if (Number.isFinite(week)) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [week]);
    useEffect(() => { if (!advancedOpen) setOverridesJson(JSON.stringify(overrides, null, 2)); }, [overrides, advancedOpen]);

    function setMultiplier(kind: "arrivals" | "spend", v: number) {
        const value = clamp(v, 0.5, 1.5);
        setOverrides((prev) => ({ ...prev, arrivals_multiplier: kind === "arrivals" ? value : prev.arrivals_multiplier, spend_multiplier: kind === "spend" ? value : prev.spend_multiplier }));
    }

    function addStaffingDelta() {
        if (!deltaDaypartId) return;
        const row: StaffingChange = { weekday: deltaWeekday, daypart_id: deltaDaypartId, role: deltaRole, delta_staff: Number(deltaCount) };
        setOverrides((prev) => ({ ...prev, staffing_changes: [...prev.staffing_changes, row] }));
    }

    function removeStaffingDelta(index: number) { setOverrides((prev) => ({ ...prev, staffing_changes: prev.staffing_changes.filter((_: StaffingChange, i: number) => i !== index) })); }
    function resetForm() { setName("New scenario"); setOverrides(defaultOverrides()); setAdvancedOpen(false); setOverridesJson(JSON.stringify(defaultOverrides(), null, 2)); }

    async function createScenario() {
        setError(null);
        try {
            let params: any = overrides;
            if (advancedOpen) { try { params = JSON.parse(overridesJson); } catch { throw new Error("Invalid JSON in Advanced overrides."); } }
            await api.createScenario(week, { name: name.trim() || "Scenario", params });
            toast.success(`Scenario "${name}" created!`);
            await load(); resetForm();
        } catch (e) { setError(String(e)); }
    }

    function applyTemplate(tpl: ScenarioTemplate) {
        setName(tpl.name);
        setOverrides(mergeOverrides(defaultOverrides(), tpl.overrides));
        setAdvancedOpen(false);
        toast.info(`Template "${tpl.name}" applied — customize and create!`);
    }

    async function runScenario(scenarioId: number) {
        setRunning(scenarioId); setError(null);
        try { const res = await api.runScenario(scenarioId, { runs, seed: seed === "" ? null : Number(seed) }); setResults((prev) => ({ ...prev, [scenarioId]: res })); }
        catch (e) { setError(String(e)); }
        finally { setRunning(null); }
    }

    async function deleteScenario(scenario: Scenario) {
        try {
            await api.deleteScenario(scenario.id);
            toast.success(`Scenario "${scenario.name}" deleted.`);
            setDeleteTarget(null);
            await load();
        } catch (e) {
            toast.error(`Delete failed: ${e}`);
            setDeleteTarget(null);
        }
    }

    const compareMetrics = useMemo(() => ["finance.revenue", "finance.profit", "demand.served_groups", "demand.lost_groups", "queue.wait_table", "queue.wait_food", "util.kitchen", "util.tables"], []);

    if (!Number.isFinite(week)) return <div className="p-6 text-mariana">Invalid weekId.</div>;

    return (
        <div>
            <PageHeader title={`Scenarios · Week #${week}`} subtitle="Create what-if scenarios, run them, and compare stochastic results.">
                <div className="flex gap-3 flex-wrap text-sm">
                    <Link to="/baseline-weeks" className="text-deep-blue hover:underline">← Weeks</Link>
                    <Link to={`/baseline-weeks/${week}/grid`} className="text-deep-blue hover:underline">Grid</Link>
                    <Link to={`/baseline-weeks/${week}/kpis`} className="text-deep-blue hover:underline">KPI</Link>
                    <Link to={`/simulation?weekId=${week}`} className="text-deep-blue hover:underline">Simulation</Link>
                </div>
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {/* Run settings */}
            <Card className="p-5 mb-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-deep-blue to-indigo-600 flex items-center justify-center text-white text-sm shadow-lg shadow-deep-blue/20">🎛️</div>
                    <h3 className="text-sm font-bold text-mariana">Run settings</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div>
                        <label className="block text-xs text-grey mb-1">Runs</label>
                        <input type="number" value={runs} min={10} max={5000} onChange={(e) => setRuns(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-xs text-grey mb-1">Seed</label>
                        <input type="number" value={seed} onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))} placeholder="42" />
                    </div>
                </div>
                <div className="mt-3 flex gap-2 items-center">
                    <Button variant="ghost" size="sm" onClick={() => setResults({})} disabled={Object.keys(results).length === 0}>Clear results</Button>
                    <span className="text-[10px] text-grey">Clears in-memory compare results (does not delete scenarios).</span>
                </div>
            </Card>

            {/* Scenario Templates */}
            <Card className="p-5 mb-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm shadow-lg">📋</div>
                    <div>
                        <h3 className="text-sm font-bold text-mariana">Quick Templates</h3>
                        <p className="text-[10px] text-grey">Click a template to pre-fill the scenario form below.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SCENARIO_TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.name}
                            onClick={() => applyTemplate(tpl)}
                            className="text-left p-3 rounded-xl border border-mist-dark/20 bg-mist/10 hover:bg-deep-blue/5 hover:border-deep-blue/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                        >
                            <div className="text-lg mb-1">{tpl.emoji}</div>
                            <div className="text-xs font-bold text-mariana">{tpl.name}</div>
                            <div className="text-[10px] text-grey mt-0.5 leading-snug">{tpl.description}</div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Create scenario */}
            <Card className="p-5 mb-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm shadow-lg">✨</div>
                    <h3 className="text-sm font-bold text-mariana">Create scenario</h3>
                </div>

                <label className="block mb-3">
                    <span className="text-xs text-grey">Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="!w-full mt-1" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* Demand & price */}
                    <div className="border border-mist-dark/20 rounded-xl p-4 bg-mist/10">
                        <p className="text-sm font-semibold text-mariana mb-3 flex items-center gap-2">
                            <span>📈</span> Demand & price
                        </p>
                        <label className="block mb-3">
                            <span className="text-xs text-grey">Arrivals multiplier ({overrides.arrivals_multiplier.toFixed(2)})</span>
                            <input type="range" min={0.5} max={1.5} step={0.01} value={overrides.arrivals_multiplier} onChange={(e) => setMultiplier("arrivals", Number(e.target.value))} className="w-full mt-1 accent-deep-blue" />
                        </label>
                        <label className="block mb-2">
                            <span className="text-xs text-grey">Spend multiplier ({overrides.spend_multiplier.toFixed(2)})</span>
                            <input type="range" min={0.5} max={1.5} step={0.01} value={overrides.spend_multiplier} onChange={(e) => setMultiplier("spend", Number(e.target.value))} className="w-full mt-1 accent-deep-blue" />
                        </label>
                        <p className="text-[10px] text-grey">Example: spend 1.05 = +5% avg spend per group.</p>
                    </div>

                    {/* Cost overrides */}
                    <div className="border border-mist-dark/20 rounded-xl p-4 bg-mist/10">
                        <p className="text-sm font-semibold text-mariana mb-3 flex items-center gap-2">
                            <span>💰</span> Costs overrides (optional)
                        </p>
                        <label className="block mb-3">
                            <span className="text-xs text-grey">Fixed cost / week override (CZK)</span>
                            <input type="number" value={overrides.fixed_cost_week_override ?? ""} placeholder="(leave empty)"
                                onChange={(e) => setOverrides((prev) => ({ ...prev, fixed_cost_week_override: e.target.value === "" ? null : Number(e.target.value) }))} className="!w-full mt-1" />
                        </label>
                        <label className="block mb-2">
                            <span className="text-xs text-grey">Food cost % override (0–1)</span>
                            <input type="number" step="0.01" value={overrides.food_cost_pct_override ?? ""} placeholder="(leave empty)"
                                onChange={(e) => setOverrides((prev) => ({ ...prev, food_cost_pct_override: e.target.value === "" ? null : Number(e.target.value) }))} className="!w-full mt-1" />
                        </label>
                        <p className="text-[10px] text-grey">Overrides apply only to this scenario.</p>
                    </div>
                </div>

                {/* Staffing changes */}
                <div className="border border-mist-dark/20 rounded-xl p-4 mb-4 bg-mist/10">
                    <p className="text-sm font-semibold text-mariana mb-3 flex items-center gap-2">
                        <span>👷</span> Staffing changes (delta)
                    </p>
                    {dayparts.length === 0 ? (
                        <p className="text-sm text-grey">No dayparts available. Create dayparts first.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                            <div><label className="block text-xs text-grey mb-1">Weekday</label><select value={deltaWeekday} onChange={(e) => setDeltaWeekday(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></div>
                            <div><label className="block text-xs text-grey mb-1">Daypart</label><select value={deltaDaypartId ?? ""} onChange={(e) => setDeltaDaypartId(Number(e.target.value))}>{dayparts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
                            <div><label className="block text-xs text-grey mb-1">Role</label><select value={deltaRole} onChange={(e) => setDeltaRole(e.target.value as any)}><option value="kitchen">kitchen</option><option value="service">service</option></select></div>
                            <div><label className="block text-xs text-grey mb-1">Delta (+/-)</label><input type="number" value={deltaCount} onChange={(e) => setDeltaCount(Number(e.target.value))} /></div>
                            <Button size="sm" onClick={addStaffingDelta} disabled={deltaDaypartId === null}>+ Add</Button>
                        </div>
                    )}

                    {overrides.staffing_changes.length === 0 ? (
                        <p className="text-[10px] text-grey mt-2">No staffing changes.</p>
                    ) : (
                        <ul className="mt-2 space-y-1">
                            {overrides.staffing_changes.map((d: StaffingChange, idx: number) => (
                                <li key={idx} className="flex gap-2 items-center text-xs bg-white/60 rounded-lg px-2 py-1.5">
                                    <span className="text-mariana">{WEEKDAYS[d.weekday]} · daypart #{d.daypart_id} · {d.role} · delta {d.delta_staff > 0 ? `+${d.delta_staff}` : d.delta_staff}</span>
                                    <Button variant="danger" size="sm" onClick={() => removeStaffingDelta(idx)}>×</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Advanced JSON */}
                <label className="flex gap-2 items-center text-xs text-mariana mb-3 cursor-pointer">
                    <input type="checkbox" checked={advancedOpen} onChange={(e) => setAdvancedOpen(e.target.checked)} />
                    Advanced (edit raw JSON)
                </label>
                {advancedOpen && (
                    <textarea value={overridesJson} onChange={(e) => setOverridesJson(e.target.value)} rows={8}
                        className="w-full p-3 text-xs font-mono border border-mist-dark/30 rounded-xl mb-3 bg-white/80" />
                )}

                <div className="flex gap-2">
                    <Button onClick={createScenario}>💾 Save scenario</Button>
                    <Button variant="secondary" onClick={resetForm}>Reset</Button>
                </div>
            </Card>

            {/* Saved scenarios */}
            <div className="mb-5">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-mariana">Saved scenarios</h3>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-deep-blue/10 text-deep-blue text-[10px] font-bold">{items.length}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Button size="sm" onClick={runAll} disabled={runAllRunning || running !== null || items.length === 0}>
                            {runAllRunning ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running all…
                                </span>
                            ) : "▶ Run all scenarios"}
                        </Button>
                        <span className="text-[10px] text-grey">Runs sequentially → fills compare table.</span>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <Card key={i} className="p-4 animate-pulse">
                                <div className="h-4 bg-mist-dark/20 rounded w-1/3 mb-3" />
                                <div className="h-3 bg-mist-dark/10 rounded w-1/2 mb-2" />
                                <div className="h-8 bg-mist-dark/10 rounded w-20" />
                            </Card>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <Card className="p-8 text-center">
                        <div className="text-2xl mb-2">🔬</div>
                        <p className="text-sm text-grey">No scenarios yet. Create one above.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map((s) => (
                            <Card key={s.id} className={`p-4 group hover:scale-[1.01] transition-transform duration-200 ${results[s.id] ? "ring-1 ring-algae-dark/30" : ""}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">🧪</span>
                                    <div className="font-bold text-sm text-mariana">{s.name}</div>
                                </div>
                                <div className="text-[10px] text-grey mt-0.5">id: {s.id} · {s.created_at}</div>

                                <div className="mt-2 flex gap-2 items-center">
                                    <Button size="sm" onClick={() => runScenario(s.id)} disabled={runAllRunning || running !== null}>
                                        {running === s.id ? (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Running…
                                            </span>
                                        ) : "▶ Run"}
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s)} disabled={running !== null}>
                                        🗑️
                                    </Button>
                                    {results[s.id] && <span className="text-xs text-algae-dark font-medium">✓ {results[s.id].result.runs} runs</span>}
                                </div>

                                {/* Deterministic deltas */}
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
                                                    <div key={item.key} className="text-center bg-mist/20 rounded-xl p-2">
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
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Comparison table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-0 flex items-center gap-2">
                    <svg className="w-4 h-4 text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375" /></svg>
                    <h3 className="text-sm font-bold text-mariana">Compare (run results)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="!pl-5">Metric</th>
                                {items.map((s) => <th key={s.id} className="text-right">{s.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {compareMetrics.map((m) => (
                                <tr key={m}>
                                    <td className="!pl-5 font-mono text-xs">{m}</td>
                                    {items.map((s) => {
                                        const r = results[s.id]?.result.metrics[m];
                                        if (!r) return <td key={s.id} className="text-right text-grey">—</td>;
                                        return (
                                            <td key={s.id} className="text-right">
                                                <div className="font-semibold">{fmtValue(m, r.p50)}</div>
                                                <div className="text-[10px] text-grey">p10–p90: {fmtValue(m, r.p10)} → {fmtValue(m, r.p90)}</div>
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
            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete scenario?"
                message={`This will permanently delete "${deleteTarget?.name ?? ''}". This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteTarget) deleteScenario(deleteTarget); }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}