import { useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { BaselineWeek, KpisResponse } from "../api/types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";

function fmtCurrency(v: number) { return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v); }

export default function TrendPage() {
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [kpisByWeek, setKpisByWeek] = useState<Record<number, KpisResponse>>({});
    const [growthRate, setGrowthRate] = useState(5); // percent per week
    const [forecastWeeks, setForecastWeeks] = useState(4);

    useEffect(() => {
        api.listWeeks().then(async (w) => {
            setWeeks(w);
            const kpis: Record<number, KpisResponse> = {};
            for (const wk of w.slice(0, 8)) {
                try {
                    kpis[wk.id] = await api.getKpis(wk.id);
                } catch { /* skip */ }
            }
            setKpisByWeek(kpis);
        }).catch(() => { });
    }, []);

    const chartData = useMemo(() => {
        const sorted = [...weeks].sort((a, b) => a.week_start.localeCompare(b.week_start));
        const data: { name: string; revenue?: number; profit?: number; fcRevenue?: number; fcProfit?: number; forecast?: boolean }[] = [];

        sorted.forEach((w) => {
            const kpis = kpisByWeek[w.id]?.kpis;
            data.push({
                name: w.label || w.week_start,
                revenue: kpis?.["finance.revenue"],
                profit: kpis?.["finance.profit"],
            });
        });

        // Add forecast
        if (data.length > 0) {
            const lastRev = data[data.length - 1].revenue ?? 0;
            const lastProfit = data[data.length - 1].profit ?? 0;
            const growthM = 1 + growthRate / 100;

            // Connect forecast line to last actual point
            data[data.length - 1].fcRevenue = lastRev;
            data[data.length - 1].fcProfit = lastProfit;

            for (let i = 1; i <= forecastWeeks; i++) {
                data.push({
                    name: `+${i}w`,
                    fcRevenue: Math.round(lastRev * Math.pow(growthM, i)),
                    fcProfit: Math.round(lastProfit * Math.pow(growthM, i)),
                    forecast: true,
                });
            }
        }

        return data;
    }, [weeks, kpisByWeek, growthRate, forecastWeeks]);

    const lastActualIdx = weeks.length - 1;

    return (
        <div>
            <PageHeader title="📈 Trend Forecasting" subtitle="Visualize demand trends and project future performance with adjustable growth scenarios." />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 lg:col-span-1">
                    <h3 className="text-xs font-bold text-mariana mb-3">Forecast Parameters</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] text-grey mb-1">Weekly Growth Rate</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min={-10}
                                    max={20}
                                    step={0.5}
                                    value={growthRate}
                                    onChange={(e) => setGrowthRate(Number(e.target.value))}
                                    className="flex-1 h-2 bg-mist-dark/30 rounded-full appearance-none cursor-pointer accent-deep-blue"
                                />
                                <span className={`text-sm font-bold w-12 text-right ${growthRate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {growthRate >= 0 ? "+" : ""}{growthRate}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-grey mb-1">Forecast Period</label>
                            <div className="flex gap-1">
                                {[2, 4, 8, 12].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setForecastWeeks(n)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${forecastWeeks === n ? "bg-deep-blue text-white" : "bg-mist/50 text-grey hover:bg-mist"}`}
                                    >
                                        {n}w
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Projected totals */}
                    {chartData.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-mist-dark/20">
                            <div className="text-[10px] text-grey uppercase tracking-wider">Projected (Week +{forecastWeeks})</div>
                            <div>
                                <div className="text-[9px] text-grey">Revenue</div>
                                <div className="text-sm font-bold text-emerald-600">
                                    {fmtCurrency(chartData[chartData.length - 1]?.fcRevenue ?? 0)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] text-grey">Profit</div>
                                <div className={`text-sm font-bold ${(chartData[chartData.length - 1]?.fcProfit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {fmtCurrency(chartData[chartData.length - 1]?.fcProfit ?? 0)}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-5 lg:col-span-3">
                    <h3 className="text-xs font-bold text-mariana mb-3">Revenue & Profit Trend</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3366FF" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="profit" name="Profit" stroke="#04FF87" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="fcRevenue" name="Revenue (forecast)" stroke="#3366FF" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="fcProfit" name="Profit (forecast)" stroke="#04FF87" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
}
