import { useEffect, useMemo, useState } from "react";

type Daypart = { id: number; label: string; start_time: string; end_time: string; sort_order: number };

type Cell = {
    weekday: number;
    daypart_id: number;
    arrivals_groups: number;
    avg_spend_per_group: number;
    avg_party_size: number;
};

const API_BASE = "http://127.0.0.1:8000";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function BaselineGridPage(props: { weekId: number; onBack: () => void }) {
    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [cells, setCells] = useState<Record<string, Cell>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const keyOf = (weekday: number, daypartId: number) => `${weekday}:${daypartId}`;

    useEffect(() => {
        async function loadAll() {
            setError(null);
            try {
                const dpRes = await fetch(`${API_BASE}/dayparts`);
                if (!dpRes.ok) throw new Error(`Dayparts HTTP ${dpRes.status}`);
                const dp = (await dpRes.json()) as Daypart[];
                setDayparts(dp);

                const dataRes = await fetch(`${API_BASE}/baseline-weeks/${props.weekId}/data`);
                if (!dataRes.ok) throw new Error(`Data HTTP ${dataRes.status}`);
                const stored = (await dataRes.json()) as any[];

                const map: Record<string, Cell> = {};
                for (const row of stored) {
                    map[keyOf(row.weekday, row.daypart_id)] = {
                        weekday: row.weekday,
                        daypart_id: row.daypart_id,
                        arrivals_groups: row.arrivals_groups,
                        avg_spend_per_group: row.avg_spend_per_group,
                        avg_party_size: row.avg_party_size,
                    };
                }
                setCells(map);
            } catch (e) {
                setError(String(e));
            }
        }
        loadAll();
    }, [props.weekId]);

    const sortedDayparts = useMemo(
        () => [...dayparts].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [dayparts]
    );

    function getCell(weekday: number, daypartId: number): Cell {
        const k = keyOf(weekday, daypartId);
        return (
            cells[k] ?? {
                weekday,
                daypart_id: daypartId,
                arrivals_groups: 0,
                avg_spend_per_group: 0,
                avg_party_size: 2,
            }
        );
    }

    function setCell(updated: Cell) {
        setCells((prev) => ({ ...prev, [keyOf(updated.weekday, updated.daypart_id)]: updated }));
    }

    async function saveAll() {
        setSaving(true);
        setError(null);
        try {
            const payload = Object.values(cells);
            const res = await fetch(`${API_BASE}/baseline-weeks/${props.weekId}/data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24 }}>
            <button onClick={props.onBack}>← Back</button>
            <h1>Baseline grid (week #{props.weekId})</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            {sortedDayparts.length === 0 ? (
                <p>
                    No dayparts found. Create dayparts first.
                </p>
            ) : (
                <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
                    <table cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                        <tr style={{ borderBottom: "1px solid #ddd" }}>
                            <th style={{ textAlign: "left" }}>Weekday</th>
                            {sortedDayparts.map((dp) => (
                                <th key={dp.id} style={{ textAlign: "left" }}>
                                    {dp.label}<br />
                                    <span style={{ color: "#666", fontWeight: 400 }}>
                      {dp.start_time}–{dp.end_time}
                    </span>
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {WEEKDAYS.map((w, weekday) => (
                            <tr key={weekday} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td><b>{w}</b></td>

                                {sortedDayparts.map((dp) => {
                                    const c = getCell(weekday, dp.id);
                                    return (
                                        <td key={dp.id}>
                                            <div style={{ display: "grid", gap: 6 }}>
                                                <label style={{ fontSize: 12 }}>
                                                    Arrivals
                                                    <input
                                                        type="number"
                                                        value={c.arrivals_groups}
                                                        onChange={(e) => setCell({ ...c, arrivals_groups: Number(e.target.value) })}
                                                        style={{ width: 120 }}
                                                    />
                                                </label>

                                                <label style={{ fontSize: 12 }}>
                                                    Avg spend / group
                                                    <input
                                                        type="number"
                                                        value={c.avg_spend_per_group}
                                                        onChange={(e) => setCell({ ...c, avg_spend_per_group: Number(e.target.value) })}
                                                        style={{ width: 120 }}
                                                    />
                                                </label>

                                                <label style={{ fontSize: 12 }}>
                                                    Avg party size
                                                    <input
                                                        type="number"
                                                        value={c.avg_party_size}
                                                        onChange={(e) => setCell({ ...c, avg_party_size: Number(e.target.value) })}
                                                        style={{ width: 120 }}
                                                    />
                                                </label>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={saveAll} disabled={saving}>
                    {saving ? "Saving…" : "Save all"}
                </button>
            </div>
        </div>
    );
}