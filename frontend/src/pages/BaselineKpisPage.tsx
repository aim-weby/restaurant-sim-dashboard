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