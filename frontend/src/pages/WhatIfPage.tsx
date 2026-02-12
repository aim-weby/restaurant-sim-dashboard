import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { KpisResponse } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";

function fmtCurrency(v: number) { return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v); }
function fmtPct(v: number) { return `${(v * 100).toFixed(1)}%`; }

interface Slider {
    key: string; label: string; icon: string; min: number; max: number; step: number; unit: string; defaultValue: number;
    format: (v: number) => string;
}

const SLIDERS: Slider[] = [
    { key: "price", label: "Avg Price per Group", icon: "💰", min: 200, max: 2000, step: 50, unit: "CZK", defaultValue: 600, format: (v) => `${v} CZK` },
    { key: "arrivals", label: "Arrivals Multiplier", icon: "🚗", min: 0.5, max: 2.0, step: 0.05, unit: "×", defaultValue: 1.0, format: (v) => `${v.toFixed(2)}×` },
    { key: "cogs_pct", label: "COGS %", icon: "📦", min: 0.1, max: 0.6, step: 0.01, unit: "%", defaultValue: 0.30, format: (v) => fmtPct(v) },
    { key: "labor_pct", label: "Labor Cost %", icon: "👷", min: 0.1, max: 0.5, step: 0.01, unit: "%", defaultValue: 0.25, format: (v) => fmtPct(v) },
    { key: "fixed_cost", label: "Weekly Fixed Cost", icon: "🏢", min: 5000, max: 100000, step: 1000, unit: "CZK", defaultValue: 30000, format: (v) => `${v.toLocaleString("cs-CZ")} CZK` },
    { key: "party_size", label: "Avg Party Size", icon: "👥", min: 1.0, max: 6.0, step: 0.1, unit: "pax", defaultValue: 2.5, format: (v) => `${v.toFixed(1)} pax` },
];

export default function WhatIfPage() {
    const [searchParams] = useSearchParams();
    const weekId = Number(searchParams.get("weekId") || 1);
    const [baseKpis, setBaseKpis] = useState<KpisResponse | null>(null);

    const [values, setValues] = useState<Record<string, number>>(() => {
        const def: Record<string, number> = {};
        SLIDERS.forEach((s) => (def[s.key] = s.defaultValue));
        return def;
    });

    useEffect(() => {
        api.getKpis(weekId).then((data) => {
            setBaseKpis(data);
            const kpis = data.kpis ?? {};
            const totalGroups = kpis["demand.arrivals_groups"] ?? 70;
            const revenue = kpis["finance.revenue"] ?? 42000;
            const cogs = kpis["finance.cogs"] ?? 12600;
            const labor = kpis["finance.labor_cost"] ?? 10500;
            const fixed = kpis["finance.fixed_cost"] ?? 30000;
            const avgPrice = totalGroups > 0 ? revenue / totalGroups : 600;
            setValues({
                price: Math.round(avgPrice / 50) * 50,
                arrivals: 1.0,
                cogs_pct: revenue > 0 ? cogs / revenue : 0.3,
                labor_pct: revenue > 0 ? labor / revenue : 0.25,
                fixed_cost: Math.round(fixed / 1000) * 1000,
                party_size: 2.5,
            });
        }).catch(() => { /* use defaults */ });
    }, [weekId]);

    const computed = useMemo(() => {
        const baseGroups = baseKpis?.kpis?.["demand.arrivals_groups"] ?? 70;
        const groups = baseGroups * values.arrivals;
        const revenue = groups * values.price;
        const cogs = revenue * values.cogs_pct;
        const labor = revenue * values.labor_pct;
        const fixed = values.fixed_cost;
        const totalCosts = cogs + labor + fixed;
        const profit = revenue - totalCosts;
        const profitMargin = revenue > 0 ? profit / revenue : 0;
        const breakEven = values.price - (values.price * values.cogs_pct) - (values.price * values.labor_pct);
        const breakEvenGroups = breakEven > 0 ? Math.ceil(fixed / breakEven) : Infinity;

        return { groups, revenue, cogs, labor, fixed, totalCosts, profit, profitMargin, breakEvenGroups };
    }, [values, baseKpis]);

    function updateSlider(key: string, v: number) {
        setValues((prev) => ({ ...prev, [key]: v }));
    }

    function resetAll() {
        const def: Record<string, number> = {};
        SLIDERS.forEach((s) => (def[s.key] = s.defaultValue));
        setValues(def);
    }

    const profitColor = computed.profit >= 0 ? "text-emerald-600" : "text-red-600";
    const marginColor = computed.profitMargin >= 0 ? "text-emerald-600" : "text-red-600";

    return (
        <div>
            <PageHeader title="What-If Explorer" subtitle="Drag sliders to instantly see how changes affect revenue, costs, and profit.">
                <button onClick={resetAll} className="text-xs text-deep-blue hover:underline">↺ Reset all</button>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sliders */}
                <div className="lg:col-span-2 space-y-4">
                    {SLIDERS.map((s) => (
                        <Card key={s.key} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{s.icon}</span>
                                    <span className="text-xs font-semibold text-mariana">{s.label}</span>
                                </div>
                                <span className="text-sm font-bold text-deep-blue">{s.format(values[s.key])}</span>
                            </div>
                            <input
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={values[s.key]}
                                onChange={(e) => updateSlider(s.key, Number(e.target.value))}
                                className="w-full h-2 bg-mist-dark/30 rounded-full appearance-none cursor-pointer accent-deep-blue"
                            />
                            <div className="flex justify-between text-[9px] text-grey mt-1">
                                <span>{s.format(s.min)}</span>
                                <span>{s.format(s.max)}</span>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Results panel */}
                <div className="space-y-4">
                    <Card className="p-5" accent="green">
                        <div className="text-[10px] text-grey uppercase tracking-wider mb-1">Weekly Revenue</div>
                        <div className="text-2xl font-extrabold text-mariana">{fmtCurrency(computed.revenue)}</div>
                        <div className="text-[10px] text-grey">{computed.groups.toFixed(0)} groups × {fmtCurrency(values.price)}</div>
                    </Card>

                    <Card className="p-5" accent={computed.profit >= 0 ? "green" : "red"}>
                        <div className="text-[10px] text-grey uppercase tracking-wider mb-1">Weekly Profit</div>
                        <div className={`text-2xl font-extrabold ${profitColor}`}>{fmtCurrency(computed.profit)}</div>
                        <div className={`text-xs font-semibold ${marginColor}`}>{fmtPct(computed.profitMargin)} margin</div>
                    </Card>

                    <Card className="p-5">
                        <div className="text-[10px] text-grey uppercase tracking-wider mb-1">Cost Breakdown</div>
                        <div className="space-y-2 mt-2">
                            {[
                                { label: "COGS", value: computed.cogs, color: "bg-amber-500" },
                                { label: "Labor", value: computed.labor, color: "bg-indigo-500" },
                                { label: "Fixed", value: computed.fixed, color: "bg-slate-500" },
                            ].map((c) => (
                                <div key={c.label}>
                                    <div className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-grey">{c.label}</span>
                                        <span className="font-bold text-mariana">{fmtCurrency(c.value)}</span>
                                    </div>
                                    <div className="h-1.5 bg-mist-dark/20 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${c.color} transition-all duration-300`}
                                            style={{ width: `${Math.min((c.value / computed.totalCosts) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-mist-dark/20 flex justify-between text-xs font-bold">
                                <span>Total Costs</span>
                                <span className="text-mariana">{fmtCurrency(computed.totalCosts)}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5" accent="blue">
                        <div className="text-[10px] text-grey uppercase tracking-wider mb-1">Break-Even Point</div>
                        <div className="text-xl font-extrabold text-mariana">
                            {computed.breakEvenGroups === Infinity ? "∞" : computed.breakEvenGroups}
                        </div>
                        <div className="text-[10px] text-grey">groups / week needed</div>
                        {computed.breakEvenGroups !== Infinity && (
                            <div className={`text-xs font-semibold mt-1 ${computed.groups >= computed.breakEvenGroups ? "text-emerald-600" : "text-red-600"}`}>
                                {computed.groups >= computed.breakEvenGroups
                                    ? `✓ ${(computed.groups - computed.breakEvenGroups).toFixed(0)} groups above`
                                    : `✕ ${(computed.breakEvenGroups - computed.groups).toFixed(0)} groups below`
                                }
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
