import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import type { Daypart } from "../api/types";

export default function DaypartsPage() {
    const [items, setItems] = useState<Daypart[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [newLabel, setNewLabel] = useState("");
    const [newStart, setNewStart] = useState("11:00");
    const [newEnd, setNewEnd] = useState("14:00");
    const [newOrder, setNewOrder] = useState(0);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            setItems(await api.listDayparts());
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function addDaypart() {
        setError(null);
        try {
            // pozor: v api/endpoints.ts zatím nemáš createDaypart/updateDaypart/deleteDaypart
            // takže použijeme fetchJson přímo nebo doplníme endpoints. Nejčistší je doplnit endpoints.
            // Pro teď použijeme fetchJson přes api layer rozšířením: viz níže v poznámce.
            await (api as any).createDaypart({
                label: newLabel.trim(),
                start_time: newStart,
                end_time: newEnd,
                sort_order: Number(newOrder),
            });

            setNewLabel("");
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    async function saveDaypart(dp: Daypart) {
        setError(null);
        try {
            await (api as any).updateDaypart(dp.id, {
                label: dp.label,
                start_time: dp.start_time,
                end_time: dp.end_time,
                sort_order: dp.sort_order,
            });
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    async function deleteDaypart(id: number) {
        if (!confirm("Delete this daypart?")) return;
        setError(null);
        try {
            await (api as any).deleteDaypart(id);
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
            </div>

            <h1>Dayparts</h1>

            <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <h3 style={{ marginTop: 0 }}>Add daypart</h3>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8 }}>
                    <input placeholder="Label (e.g. Lunch)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                    <input value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                    <input value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                    <input type="number" value={newOrder} onChange={(e) => setNewOrder(Number(e.target.value))} />
                    <button onClick={addDaypart} disabled={!newLabel.trim()}>
                        Add
                    </button>
                </div>
                <p style={{ marginBottom: 0, color: "#666" }}>
                    Times are HH:MM strings for BP MVP. You can refine validation later.
                </p>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {loading ? (
                <p>Loading…</p>
            ) : (
                <div style={{ marginTop: 16 }}>
                    {items.length === 0 ? (
                        <p>No dayparts yet.</p>
                    ) : (
                        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                            <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                                <th>Label</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Order</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((dp, idx) => (
                                <tr key={dp.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                    <td>
                                        <input
                                            value={dp.label}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, label: v } : x)));
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={dp.start_time}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, start_time: v } : x)));
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={dp.end_time}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, end_time: v } : x)));
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={dp.sort_order}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: v } : x)));
                                            }}
                                        />
                                    </td>
                                    <td style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => saveDaypart(dp)}>Save</button>
                                        <button onClick={() => deleteDaypart(dp.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <div style={{ marginTop: 18 }}>
                <button onClick={load}>Reload</button>
            </div>
        </div>
    );
}