import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Scenario, ScenarioKpisResponse } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

function fmtCurrency(v: number) { return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v); }

const METRICS = [
    { key: "finance.revenue", label: "Revenue", icon: "💰" },
    { key: "finance.profit", label: "Profit", icon: "📈" },
    { key: "finance.cogs", label: "COGS", icon: "📦" },
    { key: "finance.labor_cost", label: "Labor Cost", icon: "👷" },
    { key: "finance.profit_margin", label: "Profit Margin", icon: "📊", pct: true },
    { key: "demand.arrivals_groups", label: "Group Arrivals", icon: "🚗" },
    { key: "demand.turnaways", label: "Turnaways", icon: "🚫" },
    { key: "operations.avg_wait_min", label: "Avg Wait (min)", icon: "⏱️" },
];

export default function ComparePage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selA, setSelA] = useState<number | null>(null);
    const [selB, setSelB] = useState<number | null>(null);
    const [kpisA, setKpisA] = useState<ScenarioKpisResponse | null>(null);
    const [kpisB, setKpisB] = useState<ScenarioKpisResponse | null>(null);
    const [loadingA, setLoadingA] = useState(false);
    const [loadingB, setLoadingB] = useState(false);

    useEffect(() => {
        api.listScenarios().then(setScenarios).catch(() => { });
    }, []);

    async function loadKpis(id: number, side: "A" | "B") {
        const setLoading = side === "A" ? setLoadingA : setLoadingB;
        const setKpis = side === "A" ? setKpisA : setKpisB;
        setLoading(true);
        try {
            const kpis = await api.getScenarioKpis(id);
            setKpis(kpis);
        } catch { setKpis(null); }
        setLoading(false);
    }

    function selectA(id: number) { setSelA(id); loadKpis(id, "A"); }
    function selectB(id: number) { setSelB(id); loadKpis(id, "B"); }

    function getMetric(kpis: ScenarioKpisResponse | null, key: string): number | null {
        if (!kpis?.metrics) return null;
        const m = kpis.metrics[key];
        if (!m) return null;
        return typeof m === "object" && m !== null && "mean" in m ? (m as any).mean : (typeof m === "number" ? m : null);
    }

    return (
        <div>
            <PageHeader title="A/B Scenario Comparison" subtitle="Select two scenarios to compare side-by-side." />

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                    { side: "A" as const, sel: selA, onSelect: selectA, color: "from-blue-500 to-indigo-600", label: "Scenario A" },
                    { side: "B" as const, sel: selB, onSelect: selectB, color: "from-purple-500 to-fuchsia-600", label: "Scenario B" },
                ].map((s) => (
                    <Card key={s.side} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-[10px] font-bold shadow-lg`}>
                                {s.side}
                            </div>
                            <span className="text-xs font-bold text-mariana">{s.label}</span>
                        </div>
                        <select
                            value={s.sel ?? ""}
                            onChange={(e) => s.onSelect(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-mist-dark/30 text-sm"
                        >
                            <option value="">Select scenario…</option>
                            {scenarios.map((sc) => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                        </select>
                    </Card>
                ))}
            </div>

            {/* Comparison */}
            {(kpisA || kpisB) && (
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-mariana mb-4">Metric Comparison</h3>
                    <div className="space-y-3">
                        {METRICS.map((m) => {
                            const a = getMetric(kpisA, m.key);
                            const b = getMetric(kpisB, m.key);
                            const delta = a !== null && b !== null ? b - a : null;
                            const deltaPct = a !== null && b !== null && a !== 0 ? ((b - a) / Math.abs(a)) * 100 : null;

                            const formatVal = (v: number | null) => {
                                if (v === null) return "—";
                                if (m.pct) return `${(v * 100).toFixed(1)}%`;
                                if (m.key.startsWith("finance.")) return fmtCurrency(v);
                                return v.toFixed(1);
                            };

                            return (
                                <div key={m.key} className="grid grid-cols-[auto_1fr_80px_80px_100px] gap-3 items-center py-2 border-b border-mist-dark/10 last:border-b-0">
                                    <span className="text-sm">{m.icon}</span>
                                    <span className="text-xs font-medium text-mariana">{m.label}</span>
                                    <span className="text-xs text-right font-bold text-blue-600">{loadingA ? "…" : formatVal(a)}</span>
                                    <span className="text-xs text-right font-bold text-purple-600">{loadingB ? "…" : formatVal(b)}</span>
                                    <span className={`text-xs text-right font-bold ${delta === null ? "text-grey" : delta >= 0
                                            ? (m.key.includes("cogs") || m.key.includes("labor") || m.key.includes("wait") || m.key.includes("turnaway") ? "text-red-600" : "text-emerald-600")
                                            : (m.key.includes("cogs") || m.key.includes("labor") || m.key.includes("wait") || m.key.includes("turnaway") ? "text-emerald-600" : "text-red-600")
                                        }`}>
                                        {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${m.pct ? `${(delta * 100).toFixed(1)}pp` : m.key.startsWith("finance.") ? fmtCurrency(delta) : delta.toFixed(1)}`}
                                        {deltaPct !== null && !m.pct && <span className="text-[9px] text-grey ml-1">({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 mt-4 text-[10px] text-grey">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" /> A</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-purple-600 mr-1" /> B</span>
                        <span className="ml-auto">Δ = B − A</span>
                    </div>
                </Card>
            )}
        </div>
    );
}
