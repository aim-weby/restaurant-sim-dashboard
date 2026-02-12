import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { KpisResponse } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";

function formatValue(metric: string, value: number) {
    if (metric.startsWith("finance.") && !metric.endsWith("_ratio") && !metric.endsWith("_margin")) {
        return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(value);
    }
    if (metric.endsWith("_ratio") || metric.endsWith("_margin")) {
        return `${(value * 100).toFixed(1)} %`;
    }
    return value.toFixed(2);
}

function niceLabel(key: string): string {
    return key.split(".").pop()?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? key;
}

const PRIMARY = [
    "finance.revenue", "finance.profit", "finance.cogs",
    "finance.labor_cost", "finance.fixed_cost", "finance.profit_margin",
    "finance.prime_cost_ratio", "finance.labor_cost_ratio", "demand.arrivals_groups",
];

const ICONS: Record<string, { icon: string; color: string }> = {
    "finance.revenue": { icon: "💰", color: "from-deep-blue to-blue-700" },
    "finance.profit": { icon: "📈", color: "from-emerald-500 to-green-600" },
    "finance.cogs": { icon: "📦", color: "from-amber-500 to-orange-600" },
    "finance.labor_cost": { icon: "👷", color: "from-indigo-500 to-violet-600" },
    "finance.fixed_cost": { icon: "🏢", color: "from-slate-500 to-slate-700" },
    "finance.profit_margin": { icon: "📊", color: "from-emerald-500 to-green-600" },
    "finance.prime_cost_ratio": { icon: "⚙️", color: "from-deep-blue to-blue-700" },
    "finance.labor_cost_ratio": { icon: "🔧", color: "from-indigo-500 to-violet-600" },
    "demand.arrivals_groups": { icon: "🚗", color: "from-deep-blue to-indigo-600" },
};

export default function BaselineKpisPage() {
    const { weekId } = useParams();
    const week = Number(weekId);
    const [data, setData] = useState<KpisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (Number.isFinite(week))
            api.getKpis(week).then(setData).catch((e) => setError(String(e)));
    }, [week]);

    const rows = useMemo(() => {
        if (!data) return [];
        const kpis = data.kpis ?? {};
        return PRIMARY.filter((k) => k in kpis).map((k) => ({ key: k, value: kpis[k] }));
    }, [data]);

    if (!Number.isFinite(week)) return <div className="p-6 text-red-600">Invalid weekId.</div>;

    return (
        <div>
            <PageHeader title={`Baseline KPIs — Week #${week}`} subtitle="Deterministic financial KPIs computed from baseline data.">
                <Link to={`/baseline-weeks/${week}/dashboard`} className="text-sm text-deep-blue hover:underline">← Dashboard</Link>
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {!data ? (
                <div className="flex items-center justify-center h-32 gap-3">
                    <div className="w-5 h-5 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                    <span className="text-grey text-sm">Loading KPIs…</span>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rows.map((r) => {
                            const meta = ICONS[r.key] ?? { icon: "📊", color: "from-deep-blue to-blue-700" };
                            const isProfit = r.key === "finance.profit";
                            const isRevenue = r.key === "finance.revenue";
                            return (
                                <Card
                                    key={r.key}
                                    accent={isRevenue ? "blue" : isProfit ? "green" : "none"}
                                    className="p-5 group hover:scale-[1.02] transition-transform duration-200"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] text-grey uppercase tracking-wider font-medium">{niceLabel(r.key)}</div>
                                            <div className="text-2xl font-extrabold text-mariana mt-1">{formatValue(r.key, r.value)}</div>
                                            <div className="text-[10px] text-grey/60 mt-0.5 font-mono">{r.key}</div>
                                        </div>
                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-sm shadow-lg flex-shrink-0`}>
                                            {meta.icon}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Break-even analysis */}
                    {(() => {
                        const kpis = data.kpis ?? {};
                        const revenue = kpis["finance.revenue"] ?? 0;
                        const cogs = kpis["finance.cogs"] ?? 0;
                        const laborCost = kpis["finance.labor_cost"] ?? 0;
                        const fixedCost = kpis["finance.fixed_cost"] ?? 0;
                        const totalGroups = kpis["demand.arrivals_groups"] ?? 0;

                        if (totalGroups === 0 || revenue === 0) return null;

                        const revenuePerGroup = revenue / totalGroups;
                        const cogsPerGroup = cogs / totalGroups;
                        const laborPerGroup = laborCost / totalGroups;
                        const contributionPerGroup = revenuePerGroup - cogsPerGroup - laborPerGroup;

                        if (contributionPerGroup <= 0) {
                            return (
                                <Card className="p-5 mt-6" accent="red">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-sm shadow-lg">⚠️</div>
                                        <h3 className="text-sm font-bold text-mariana">Break-Even Analysis</h3>
                                    </div>
                                    <p className="text-sm text-grey">Contribution margin per group is negative — revenue per group doesn't cover variable costs. Adjust pricing or costs.</p>
                                </Card>
                            );
                        }

                        const breakEvenGroups = Math.ceil(fixedCost / contributionPerGroup);
                        const breakEvenDaily = (breakEvenGroups / 7).toFixed(1);
                        const safetyMargin = ((totalGroups - breakEvenGroups) / totalGroups) * 100;
                        const utilizationPct = Math.min((totalGroups / breakEvenGroups) * 100, 200);

                        return (
                            <Card className="p-5 mt-6" accent={safetyMargin >= 0 ? "green" : "red"}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${safetyMargin >= 0 ? "from-emerald-500 to-green-600" : "from-red-500 to-rose-600"} flex items-center justify-center text-white text-sm shadow-lg`}>📐</div>
                                    <div>
                                        <h3 className="text-sm font-bold text-mariana">Break-Even Analysis</h3>
                                        <p className="text-[10px] text-grey">How many groups you need to cover all costs</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <div className="text-[10px] text-grey uppercase tracking-wider">Break-Even Point</div>
                                        <div className="text-xl font-extrabold text-mariana">{breakEvenGroups}</div>
                                        <div className="text-[10px] text-grey">groups / week</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-grey uppercase tracking-wider">Daily Average</div>
                                        <div className="text-xl font-extrabold text-mariana">{breakEvenDaily}</div>
                                        <div className="text-[10px] text-grey">groups / day</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-grey uppercase tracking-wider">Current Demand</div>
                                        <div className="text-xl font-extrabold text-mariana">{totalGroups}</div>
                                        <div className="text-[10px] text-grey">groups / week</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-grey uppercase tracking-wider">Safety Margin</div>
                                        <div className={`text-xl font-extrabold ${safetyMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {safetyMargin >= 0 ? "+" : ""}{safetyMargin.toFixed(1)}%
                                        </div>
                                        <div className="text-[10px] text-grey">{safetyMargin >= 0 ? "above" : "below"} break-even</div>
                                    </div>
                                </div>

                                {/* Visual bar */}
                                <div className="relative h-4 bg-mist-dark/20 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${safetyMargin >= 0 ? "bg-gradient-to-r from-emerald-500 to-green-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`}
                                        style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                                    />
                                    {/* Break-even marker */}
                                    <div
                                        className="absolute inset-y-0 w-0.5 bg-mariana/50"
                                        style={{ left: `${Math.min((breakEvenGroups / Math.max(totalGroups, breakEvenGroups)) * 100, 100)}%` }}
                                    >
                                        <div className="absolute -top-5 -translate-x-1/2 text-[9px] font-bold text-mariana whitespace-nowrap">BE</div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-grey">0</span>
                                    <span className="text-[9px] text-grey">{Math.max(totalGroups, breakEvenGroups)} groups</span>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-grey border-t border-mist-dark/20 pt-3">
                                    <div>Revenue/group: <span className="font-bold text-mariana">{formatValue("finance.x", revenuePerGroup)}</span></div>
                                    <div>Variable cost/group: <span className="font-bold text-mariana">{formatValue("finance.x", cogsPerGroup + laborPerGroup)}</span></div>
                                    <div>Contribution/group: <span className="font-bold text-mariana">{formatValue("finance.x", contributionPerGroup)}</span></div>
                                </div>
                            </Card>
                        );
                    })()}

                    {data.inputs_used && (
                        <details className="mt-6">
                            <summary className="text-sm text-grey cursor-pointer hover:text-mariana transition flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                                View raw inputs used
                            </summary>
                            <pre className="mt-2 bg-white rounded-card p-4 text-xs overflow-x-auto border border-mist-dark/30">
                                {JSON.stringify(data.inputs_used, null, 2)}
                            </pre>
                        </details>
                    )}
                </>
            )}
        </div>
    );
}