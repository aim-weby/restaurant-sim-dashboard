import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineCell, Daypart } from "../api/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function keyOf(weekday: number, daypartId: number) {
    return `${weekday}:${daypartId}`;
}

export default function BaselineGridPage() {
    const { weekId } = useParams();
    const week = Number(weekId);
    const nav = useNavigate();

    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [cells, setCells] = useState<Record<string, BaselineCell>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const [dp, data] = await Promise.all([
                    api.listDayparts(),
                    api.getBaselineData(week),
                ]);
                setDayparts(dp);

                const map: Record<string, BaselineCell> = {};
                for (const c of data) {
                    map[keyOf(c.weekday, c.daypart_id)] = c;
                }
                setCells(map);
            } catch (e) {
                setError(String(e));
            }
        }

        if (Number.isFinite(week)) load();
    }, [week]);

    const grid = useMemo(() => {
        return WEEKDAYS.map((_, wd) => {
            return dayparts.map((d) => {
                const k = keyOf(wd, d.id);
                const existing = cells[k];
                return {
                    weekday: wd,
                    daypartId: d.id,
                    value: existing ?? {
                        weekday: wd,
                        daypart_id: d.id,
                        arrivals_groups: 0,
                        avg_spend_per_group: 0,
                        avg_party_size: 0,
                    },
                };
            });
        });
    }, [cells, dayparts]);

    function updateCell(weekday: number, daypartId: number, patch: Partial<BaselineCell>) {
        const k = keyOf(weekday, daypartId);
        setCells((prev) => {
            const base = prev[k] ?? {
                weekday,
                daypart_id: daypartId,
                arrivals_groups: 0,
                avg_spend_per_group: 0,
                avg_party_size: 0,
            };
            return { ...prev, [k]: { ...base, ...patch } };
        });
    }

    async function saveAll() {
        setSaving(true);
        setError(null);
        try {
            const list = Object.values(cells).map((c) => ({
                weekday: c.weekday,
                daypart_id: c.daypart_id,
                arrivals_groups: Number(c.arrivals_groups),
                avg_spend_per_group: Number(c.avg_spend_per_group),
                avg_party_size: Number(c.avg_party_size),
            }));
            await api.putBaselineData(week, list);
            nav(`/baseline-weeks/${week}/kpis`);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    if (!Number.isFinite(week)) {
        return <div style={{ padding: 24 }}>Invalid weekId.</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <h1>Baseline grid (week #{week})</h1>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
                <Link to={`/baseline-weeks/${week}/kpis`}>View KPI</Link>
                <Link to={`/baseline-weeks/${week}/scenarios`}>Scenarios</Link>
                <Link to={`/simulation?weekId=${week}`}>Simulation</Link>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <button onClick={saveAll} disabled={saving} style={{ marginTop: 12 }}>
                {saving ? "Saving…" : "Save all & View KPI"}
            </button>

            {dayparts.length === 0 ? (
                <p style={{ marginTop: 12 }}>Create dayparts first.</p>
            ) : (
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                    <table cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                            <th>Weekday</th>
                            {dayparts.map((d) => (
                                <th key={d.id}>{d.label}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {grid.map((row, wd) => (
                            <tr key={wd} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td style={{ fontWeight: 700 }}>{WEEKDAYS[wd]}</td>
                                {row.map((cell) => (
                                    <td key={`${cell.weekday}-${cell.daypartId}`} style={{ verticalAlign: "top" }}>
                                        <div style={{ display: "grid", gap: 6 }}>
                                            <label style={{ display: "grid", gap: 4 }}>
                                                Arrivals (groups)
                                                <input
                                                    type="number"
                                                    value={cell.value.arrivals_groups}
                                                    onChange={(e) => updateCell(cell.weekday, cell.daypartId, { arrivals_groups: Number(e.target.value) })}
                                                />
                                            </label>

                                            <label style={{ display: "grid", gap: 4 }}>
                                                Avg spend / group
                                                <input
                                                    type="number"
                                                    value={cell.value.avg_spend_per_group}
                                                    onChange={(e) => updateCell(cell.weekday, cell.daypartId, { avg_spend_per_group: Number(e.target.value) })}
                                                />
                                            </label>

                                            <label style={{ display: "grid", gap: 4 }}>
                                                Avg party size
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={cell.value.avg_party_size}
                                                    onChange={(e) => updateCell(cell.weekday, cell.daypartId, { avg_party_size: Number(e.target.value) })}
                                                />
                                            </label>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}