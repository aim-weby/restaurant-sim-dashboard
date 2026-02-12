import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { ExperimentResult, ExperimentsResponse } from "../api/types";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";

const METRICS = [
    { key: "revenue", label: "Revenue", icon: "💰", fmt: (v: number) => `${v.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK` },
    { key: "profit", label: "Profit", icon: "📈", fmt: (v: number) => `${v.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK` },
    { key: "served_groups", label: "Served", icon: "✅", fmt: (v: number) => v.toFixed(1) },
    { key: "lost_groups", label: "Lost", icon: "❌", fmt: (v: number) => v.toFixed(2) },
    { key: "avg_wait_food", label: "Avg Wait", icon: "⏱️", fmt: (v: number) => `${v.toFixed(1)} min` },
    { key: "p90_wait_food", label: "P90 Wait", icon: "⏳", fmt: (v: number) => `${v.toFixed(1)} min` },
    { key: "util_kitchen", label: "Kitchen Util.", icon: "👨‍🍳", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
];

const EXP_ICONS: Record<string, string> = {
    baseline: "📋", add_kitchen_sat: "👨‍🍳", price_up_8: "💲", add_4_seats: "🪑", extend_fri_sat: "🌙", combined: "🔀",
};

export default function ExperimentsPage() {
    const toast = useToast();
    const [searchParams] = useSearchParams();
    const weekId = Number(searchParams.get("weekId") || 1);

    const [data, setData] = useState<ExperimentsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState(42);
    const [elapsed, setElapsed] = useState<number | null>(null);

    async function runAll() {
        setLoading(true);
        setElapsed(null);
        const t0 = Date.now();
        try {
            const res = await api.runExperiments(weekId, runs, seed);
            setData(res);
            setElapsed(Math.round((Date.now() - t0) / 1000));
        } catch (e) {
            toast.error(`Experiment failed: ${e}`);
        } finally {
            setLoading(false);
        }
    }

    function exportJson() {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `experiments_week${weekId}_${runs}runs.json`; a.click();
        URL.revokeObjectURL(url);
    }

    function exportCsv() {
        if (!data) return;
        const header = ["experiment", ...METRICS.map(m => m.label), ...METRICS.map(m => `Δ ${m.label}`), ...METRICS.map(m => `Δ% ${m.label}`)];
        const rows = data.experiments.map(exp => {
            const vals = METRICS.map(m => exp.summary[m.key]?.mean ?? 0);
            const deltas = METRICS.map(m => exp.deltas?.[m.key]?.delta ?? 0);
            const deltaPcts = METRICS.map(m => exp.deltas?.[m.key]?.delta_pct ?? 0);
            return [exp.name, ...vals, ...deltas, ...deltaPcts].join(",");
        });
        const csv = [header.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `experiments_week${weekId}_${runs}runs.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    const deltaColor = (v: number, metric: string) => {
        const inverted = ["avg_wait_food", "p90_wait_food", "lost_groups"].includes(metric);
        if (v === 0) return "text-grey";
        const isGood = inverted ? v < 0 : v > 0;
        return isGood ? "text-green-600" : "text-red-600";
    };

    return (
        <div>
            <PageHeader
                title="Experiment Runner"
                subtitle={`Runs 6 predefined scenarios from the thesis spec against baseline week #${weekId}.`}
            />

            {/* Controls */}
            <Card className="p-5 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm shadow-lg shadow-indigo-500/20">🧪</div>
                        <div>
                            <label className="block text-xs font-medium text-grey mb-1">Runs / experiment</label>
                            <input
                                type="number"
                                value={runs}
                                onChange={(e) => setRuns(Math.max(10, Number(e.target.value)))}
                                className="!w-24"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">Seed</label>
                        <input
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(Number(e.target.value))}
                            className="!w-24"
                        />
                    </div>
                    <Button onClick={runAll} disabled={loading}>
                        {loading ? (
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Running all…
                            </span>
                        ) : "▶ Run All Experiments"}
                    </Button>
                    {elapsed !== null && (
                        <span className="flex items-center gap-1.5 text-xs text-algae-dark font-medium">
                            <span className="w-2 h-2 rounded-full bg-algae-dark" />
                            Done in {elapsed}s ({data?.experiment_count} × {runs} runs)
                        </span>
                    )}
                </div>
            </Card>

            {data && (
                <>
                    {/* Export buttons */}
                    <div className="flex gap-2 mb-5">
                        <Button variant="secondary" size="sm" onClick={exportJson}>📥 Export JSON</Button>
                        <Button variant="secondary" size="sm" onClick={exportCsv}>📊 Export CSV</Button>
                    </div>

                    {/* Experiment cards */}
                    <div className="space-y-4 mb-6">
                        {data.experiments.map((exp: ExperimentResult) => (
                            <Card key={exp.id} className="p-5 group hover:scale-[1.003] transition-transform duration-200" accent={exp.id === "baseline" ? "blue" : "none"}>
                                <div className="flex justify-between items-baseline mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xl">{EXP_ICONS[exp.id] ?? "🧪"}</span>
                                        <div>
                                            <span className="font-bold text-mariana">{exp.name}</span>
                                            <span className="ml-2 text-xs text-grey">{exp.description}</span>
                                        </div>
                                    </div>
                                    {exp.id === "baseline" && <StatusBadge variant="info">REFERENCE</StatusBadge>}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {METRICS.map((m) => {
                                        const mean = exp.summary[m.key]?.mean ?? 0;
                                        const delta = exp.deltas?.[m.key];
                                        return (
                                            <div key={m.key} className="bg-mist/30 rounded-xl p-3 hover:bg-mist/50 transition-colors duration-200">
                                                <div className="flex items-center gap-1 text-[10px] text-grey uppercase tracking-wider">
                                                    <span>{m.icon}</span>
                                                    <span>{m.label}</span>
                                                </div>
                                                <div className="text-sm font-bold text-mariana mt-1">{m.fmt(mean)}</div>
                                                {delta && (
                                                    <div className={`text-[10px] font-semibold mt-1 ${deltaColor(delta.delta, m.key)}`}>
                                                        {delta.delta >= 0 ? "+" : ""}{m.fmt(delta.delta)} ({delta.delta_pct >= 0 ? "+" : ""}{delta.delta_pct.toFixed(1)}%)
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Comparison matrix */}
                    <Card className="overflow-hidden">
                        <div className="p-5 pb-0 flex items-center gap-2">
                            <svg className="w-4 h-4 text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-7.5" /></svg>
                            <h3 className="text-sm font-bold text-mariana">
                                Comparison Matrix (mean ± Δ%)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="!pl-5">Scenario</th>
                                        {METRICS.map((m) => (
                                            <th key={m.key} className="text-right">{m.icon} {m.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.experiments.map((exp) => (
                                        <tr key={exp.id} className={exp.id === "baseline" ? "bg-deep-blue/5" : ""}>
                                            <td className="!pl-5 font-semibold">
                                                <span className="mr-1">{EXP_ICONS[exp.id] ?? "🧪"}</span>
                                                {exp.name}
                                            </td>
                                            {METRICS.map((m) => {
                                                const mean = exp.summary[m.key]?.mean ?? 0;
                                                const delta = exp.deltas?.[m.key];
                                                return (
                                                    <td key={m.key} className="text-right">
                                                        {m.fmt(mean)}
                                                        {delta && (
                                                            <span className={`ml-1 text-[10px] font-semibold ${deltaColor(delta.delta, m.key)}`}>
                                                                ({delta.delta_pct >= 0 ? "+" : ""}{delta.delta_pct.toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Sensitivity / Tornado chart */}
                    <Card className="p-5 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-sm shadow-lg">🌪️</div>
                            <div>
                                <h3 className="text-sm font-bold text-mariana">Sensitivity Tornado — Profit Impact</h3>
                                <p className="text-[10px] text-grey">Scenarios ranked by absolute profit change vs baseline</p>
                            </div>
                        </div>
                        {(() => {
                            const baseline = data.experiments.find((e) => e.id === "baseline");
                            if (!baseline) return <p className="text-sm text-grey">No baseline found.</p>;
                            const baselineProfit = baseline.summary["profit"]?.mean ?? 0;
                            const impacts = data.experiments
                                .filter((e) => e.id !== "baseline" && e.deltas?.["profit"])
                                .map((e) => ({
                                    name: e.name,
                                    icon: EXP_ICONS[e.id] ?? "🧪",
                                    delta: e.deltas!["profit"].delta,
                                    pct: e.deltas!["profit"].delta_pct,
                                }))
                                .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

                            const maxDelta = Math.max(...impacts.map((i) => Math.abs(i.delta)), 1);

                            return (
                                <div className="space-y-2.5">
                                    {impacts.map((imp) => {
                                        const barWidth = (Math.abs(imp.delta) / maxDelta) * 100;
                                        const isPositive = imp.delta >= 0;
                                        return (
                                            <div key={imp.name} className="flex items-center gap-3">
                                                <div className="w-36 text-xs text-right text-mariana font-medium truncate flex items-center justify-end gap-1.5">
                                                    <span>{imp.icon}</span>
                                                    <span>{imp.name}</span>
                                                </div>
                                                <div className="flex-1 relative h-6">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full h-px bg-mist-dark/30" />
                                                    </div>
                                                    <div
                                                        className={`absolute top-1 h-4 rounded-md transition-all duration-500 ${isPositive
                                                            ? "bg-gradient-to-r from-emerald-400 to-green-500 left-1/2"
                                                            : "bg-gradient-to-l from-red-400 to-rose-500 right-1/2"
                                                            }`}
                                                        style={{ width: `${barWidth / 2}%` }}
                                                    />
                                                </div>
                                                <div className={`w-28 text-xs font-bold text-right ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                                    {isPositive ? "+" : ""}{imp.delta.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK
                                                    <span className="text-[10px] font-normal text-grey ml-1">({isPositive ? "+" : ""}{imp.pct.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-3 pt-2 border-t border-mist-dark/20">
                                        <div className="w-36 text-[10px] text-right text-grey">Baseline Profit</div>
                                        <div className="flex-1" />
                                        <div className="w-28 text-xs font-bold text-right text-mariana">
                                            {baselineProfit.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </Card>
                </>
            )}
        </div>
    );
}
