import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineCell, BaselineKpisResponse } from "../api/types";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    LineChart,
    Line,
    Legend,
} from "recharts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtCurrency(v: number) {
    return new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
    }).format(v);
}

function fmtPercent(v: number) {
    return `${(v * 100).toFixed(1)} %`;
}

function n(v: any, fallback = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
}

function cardStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.75)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}

function sectionStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 18,
        padding: 14,
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}

export default function DashboardPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    const [kpis, setKpis] = useState<BaselineKpisResponse | null>(null);
    const [grid, setGrid] = useState<BaselineCell[]>([]);
    const [dayparts, setDayparts] = useState<{ id: number; label: string; sort_order?: number }[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(week)) return;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [k, g, dp] = await Promise.all([
                    api.getBaselineKpis(week),
                    api.getBaselineData(week), // ✅ správně, existuje už u GridPage
                    api.listDayparts(),
                ]);

                setKpis(k);
                setGrid(g);
                setDayparts(dp.map((d: any) => ({ id: d.id, label: d.label, sort_order: d.sort_order })));
            } catch (e) {
                console.error("Dashboard load error:", e);
                setError(String(e));
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [week]);

    const daypartsSorted = useMemo(() => {
        return [...dayparts].sort((a, b) => n(a.sort_order, 0) - n(b.sort_order, 0));
    }, [dayparts]);

    const revenueByWeekday = useMemo(() => {
        const sums = Array.from({ length: 7 }, () => ({ revenue: 0, groups: 0, avgSpend: 0 }));

        for (const c of grid) {
            const rev = n(c.arrivals_groups) * n((c as any).avg_spend_per_group); // ✅ tvoje pole
            sums[c.weekday].revenue += rev;
            sums[c.weekday].groups += n(c.arrivals_groups);
        }

        for (let i = 0; i < 7; i++) {
            const g = sums[i].groups;
            sums[i].avgSpend = g > 0 ? sums[i].revenue / g : 0;
        }

        return sums.map((x, i) => ({
            weekday: WEEKDAYS[i],
            revenue: Math.round(x.revenue),
            groups: x.groups,
            avgSpend: Math.round(x.avgSpend),
        }));
    }, [grid]);

    const heatmap = useMemo(() => {
        const dpIds = daypartsSorted.map((d) => d.id);
        const m = Array.from({ length: 7 }, () => dpIds.map(() => 0));

        for (const c of grid) {
            const j = dpIds.indexOf(c.daypart_id);
            if (j >= 0) m[c.weekday][j] = n(c.arrivals_groups);
        }

        const max = Math.max(1, ...m.flat());
        return { m, max };
    }, [grid, daypartsSorted]);

    const k = kpis?.kpis ?? {};
    const revenue = n(k["finance.revenue"]);
    const profit = n(k["finance.profit"]);
    const margin = n(k["finance.profit_margin"]);
    const primeRatio = n(k["finance.prime_cost_ratio"]);
    const laborRatio = n(k["finance.labor_cost_ratio"]);
    const arrivals = n(k["demand.arrivals_groups"]);

    const headerBg: React.CSSProperties = {
        background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(0,153,255,0.22), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(255,0,122,0.16), transparent 55%)",
        borderRadius: 20,
        padding: 18,
        border: "1px solid rgba(255,255,255,0.3)",
    };

    if (!Number.isFinite(week)) return <div style={{ padding: 24 }}>Invalid weekId.</div>;
    if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1300, fontFamily: "system-ui" }}>
            <div style={headerBg}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#666" }}>Baseline week</div>
                        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
                            Dashboard · Week #{week}
                        </div>
                        <div style={{ color: "#666", marginTop: 4 }}>
                            Overview of baseline performance + demand pattern from your grid.
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link to="/baseline-weeks">← Weeks</Link>
                        <Link to={`/baseline-weeks/${week}/grid`}>Edit grid</Link>
                        <Link to={`/baseline-weeks/${week}/kpis`}>KPI detail</Link>
                        <Link to={`/baseline-weeks/${week}/scenarios`}>Scenarios</Link>
                        <Link to={`/simulation?weekId=${week}`}>Simulation</Link>
                    </div>
                </div>
            </div>

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Revenue</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtCurrency(revenue)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtCurrency(profit)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Profit margin</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(margin)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Prime cost ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(primeRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Labor cost ratio</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPercent(laborRatio)}</div>
                </div>
                <div style={cardStyle()}>
                    <div style={{ color: "#666", fontSize: 12 }}>Arrivals (groups)</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{arrivals.toFixed(0)}</div>
                </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Revenue by weekday</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Derived: arrivals_groups × avg_spend_per_group.</div>
                    </div>

                    <div style={{ height: 280, marginTop: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByWeekday}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="weekday" />
                                <YAxis />
                                <Tooltip formatter={(v: any, name: any) => (name === "revenue" ? fmtCurrency(n(v)) : v)} />
                                <Legend />
                                <Bar dataKey="revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={sectionStyle()}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Demand & avg spend</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Groups + derived avg spend per group.</div>
                    </div>

                    <div style={{ height: 280, marginTop: 10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueByWeekday}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="weekday" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="groups" />
                                <Line type="monotone" dataKey="avgSpend" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 14, ...sectionStyle() }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Arrivals heatmap (weekday × daypart)</div>
                        <div style={{ color: "#666", fontSize: 12 }}>Quickly shows where demand is concentrated.</div>
                    </div>

                    <div style={{ color: "#666", fontSize: 12 }}>
                        Max cell: <b>{heatmap.max.toFixed(0)}</b> groups
                    </div>
                </div>

                {daypartsSorted.length === 0 ? (
                    <div style={{ marginTop: 10, color: "#666" }}>No dayparts. Create dayparts first.</div>
                ) : (
                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                        <table cellPadding={10} style={{ borderCollapse: "collapse", minWidth: 900, width: "100%" }}>
                            <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th>Weekday</th>
                                {daypartsSorted.map((dp) => (
                                    <th key={dp.id}>{dp.label}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {heatmap.m.map((row, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f3f3f3" }}>
                                    <td style={{ fontWeight: 700 }}>{WEEKDAYS[i]}</td>
                                    {row.map((v, j) => {
                                        const intensity = Math.max(0.06, v / heatmap.max);
                                        return (
                                            <td
                                                key={j}
                                                title={`${v.toFixed(0)} groups`}
                                                style={{
                                                    borderRadius: 10,
                                                    background: `rgba(0, 153, 255, ${intensity})`,
                                                    color: intensity > 0.55 ? "white" : "#111",
                                                    fontWeight: 700,
                                                    textAlign: "center",
                                                }}
                                            >
                                                {v ? v.toFixed(0) : "—"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}