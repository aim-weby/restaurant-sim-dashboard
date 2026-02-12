import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { KpisResponse } from "../api/types";
import { useEffect } from "react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

function fmtCurrency(v: number) { return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v); }

export default function GoalSeekPage() {
    const [searchParams] = useSearchParams();
    const weekId = Number(searchParams.get("weekId") || 1);

    const [baseKpis, setBaseKpis] = useState<KpisResponse | null>(null);
    const [targetMargin, setTargetMargin] = useState(20); // percent
    const [mode, setMode] = useState<"price" | "arrivals" | "costs">("price");

    useEffect(() => {
        api.getKpis(weekId).then(setBaseKpis).catch(() => { });
    }, [weekId]);

    const result = useMemo(() => {
        if (!baseKpis?.kpis) return null;
        const kpis = baseKpis.kpis;
        const totalGroups = kpis["demand.arrivals_groups"] ?? 70;
        const revenue = kpis["finance.revenue"] ?? 42000;
        const cogs = kpis["finance.cogs"] ?? 12600;
        const laborCost = kpis["finance.labor_cost"] ?? 10500;
        const fixedCost = kpis["finance.fixed_cost"] ?? 30000;
        const target = targetMargin / 100;

        const currentPrice = totalGroups > 0 ? revenue / totalGroups : 600;
        const currentCogsPct = revenue > 0 ? cogs / revenue : 0.3;
        const currentLaborPct = revenue > 0 ? laborCost / revenue : 0.25;
        const currentMargin = revenue > 0 ? (revenue - cogs - laborCost - fixedCost) / revenue : 0;

        if (mode === "price") {
            // target = (price*groups - cogs_pct*price*groups - labor_pct*price*groups - fixed) / (price*groups)
            // target = 1 - cogs_pct - labor_pct - fixed/(price*groups)
            // fixed/(price*groups) = 1 - cogs_pct - labor_pct - target
            // price = fixed / (groups * (1 - cogs_pct - labor_pct - target))
            const denominator = totalGroups * (1 - currentCogsPct - currentLaborPct - target);
            const requiredPrice = denominator > 0 ? fixedCost / denominator : Infinity;
            const priceDelta = requiredPrice - currentPrice;
            return {
                metric: "Avg Price per Group",
                current: fmtCurrency(currentPrice),
                required: requiredPrice === Infinity ? "Not achievable" : fmtCurrency(requiredPrice),
                delta: priceDelta,
                deltaFmt: requiredPrice === Infinity ? "—" : `${priceDelta >= 0 ? "+" : ""}${fmtCurrency(priceDelta)}`,
                feasible: requiredPrice !== Infinity && requiredPrice > 0,
                currentMargin,
            };
        } else if (mode === "arrivals") {
            // revenue_new = groups_new * price
            // target = (revenue_new - cogs_new - labor_new - fixed) / revenue_new
            // cogs_new = cogs_pct * revenue_new, labor_new = labor_pct * revenue_new
            // target = 1 - cogs_pct - labor_pct - fixed / revenue_new
            // fixed / revenue_new = 1 - cogs_pct - labor_pct - target
            // revenue_new = fixed / (1 - cogs_pct - labor_pct - target)
            const denom = 1 - currentCogsPct - currentLaborPct - target;
            const requiredRevenue = denom > 0 ? fixedCost / denom : Infinity;
            const requiredGroups = currentPrice > 0 ? requiredRevenue / currentPrice : Infinity;
            const delta = requiredGroups - totalGroups;
            return {
                metric: "Weekly Group Arrivals",
                current: `${totalGroups.toFixed(0)} groups`,
                required: requiredGroups === Infinity ? "Not achievable" : `${requiredGroups.toFixed(0)} groups`,
                delta,
                deltaFmt: requiredGroups === Infinity ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)} groups`,
                feasible: requiredGroups !== Infinity && requiredGroups > 0,
                currentMargin,
            };
        } else {
            // mode === "costs"
            // target = (revenue - totalVariable - fixed_new) / revenue
            // fixed_new = revenue * (1 - cogs_pct - labor_pct - target)
            const totalVariable = cogs + laborCost;
            const requiredFixed = revenue - totalVariable - (target * revenue);
            const delta = requiredFixed - fixedCost;
            return {
                metric: "Weekly Fixed Costs",
                current: fmtCurrency(fixedCost),
                required: requiredFixed < 0 ? "Not achievable" : fmtCurrency(requiredFixed),
                delta,
                deltaFmt: requiredFixed < 0 ? "—" : `${delta >= 0 ? "+" : ""}${fmtCurrency(delta)}`,
                feasible: requiredFixed >= 0,
                currentMargin,
            };
        }
    }, [baseKpis, targetMargin, mode]);

    return (
        <div>
            <PageHeader title="🎯 Goal-Seek" subtitle="Find what needs to change to hit your target profit margin." />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Target inputs */}
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-mariana mb-4 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs shadow-lg">🎯</span>
                        Set Your Target
                    </h3>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-grey mb-1">Target Profit Margin (%)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={-20}
                                max={50}
                                step={1}
                                value={targetMargin}
                                onChange={(e) => setTargetMargin(Number(e.target.value))}
                                className="flex-1 h-2 bg-mist-dark/30 rounded-full appearance-none cursor-pointer accent-purple-600"
                            />
                            <span className={`text-lg font-extrabold w-16 text-right ${targetMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {targetMargin}%
                            </span>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-grey mb-2">Solve For</label>
                        <div className="flex gap-2">
                            {[
                                { key: "price" as const, label: "💰 Price", desc: "Adjust avg price per group" },
                                { key: "arrivals" as const, label: "🚗 Arrivals", desc: "Adjust number of groups" },
                                { key: "costs" as const, label: "🏢 Fixed Costs", desc: "Adjust weekly fixed costs" },
                            ].map((m) => (
                                <button
                                    key={m.key}
                                    onClick={() => setMode(m.key)}
                                    className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${mode === m.key
                                            ? "border-purple-500 bg-purple-50 shadow-sm"
                                            : "border-mist-dark/30 hover:border-purple-300"
                                        }`}
                                >
                                    <div className="text-sm font-bold text-mariana">{m.label}</div>
                                    <div className="text-[9px] text-grey mt-0.5">{m.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Results */}
                <Card className="p-5" accent={result?.feasible ? "green" : "red"}>
                    <h3 className="text-sm font-bold text-mariana mb-4 flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-xl bg-gradient-to-br ${result?.feasible ? "from-emerald-500 to-green-600" : "from-red-500 to-rose-600"} flex items-center justify-center text-white text-xs shadow-lg`}>
                            {result?.feasible ? "✓" : "✕"}
                        </span>
                        Result
                    </h3>

                    {result && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] text-grey uppercase tracking-wider">Current</div>
                                    <div className="text-lg font-bold text-mariana">{result.current}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-grey uppercase tracking-wider">Required</div>
                                    <div className={`text-lg font-bold ${result.feasible ? "text-emerald-600" : "text-red-600"}`}>{result.required}</div>
                                </div>
                            </div>

                            <div className="py-3 px-4 rounded-xl bg-mist/30">
                                <div className="text-[10px] text-grey uppercase tracking-wider mb-1">Change Needed</div>
                                <div className={`text-xl font-extrabold ${result.feasible ? (result.delta >= 0 ? "text-red-600" : "text-emerald-600") : "text-red-600"}`}>
                                    {result.deltaFmt}
                                </div>
                            </div>

                            <div className="flex gap-4 text-[10px] pt-2 border-t border-mist-dark/20">
                                <div>
                                    <span className="text-grey">Current Margin: </span>
                                    <span className="font-bold text-mariana">{(result.currentMargin * 100).toFixed(1)}%</span>
                                </div>
                                <div>
                                    <span className="text-grey">Target Margin: </span>
                                    <span className="font-bold text-purple-600">{targetMargin}%</span>
                                </div>
                            </div>

                            {!result.feasible && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
                                    ⚠️ This target margin isn't achievable by adjusting {result.metric} alone. Try combining levers or adjusting the target.
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
