import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Daypart = { id: number; label: string; start_time: string; end_time: string; sort_order: number };

type StaffingRow = {
    id?: number;
    weekday: number;
    daypart_id: number;
    role: string; // kitchen | service
    staff_count: number;
    hourly_rate: number;
    hours_in_daypart: number;
};

export default function StaffingPage(props: { onBack: () => void }) {
    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [rows, setRows] = useState<StaffingRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const dpRes = await fetch(`${API_BASE}/dayparts`);
                if (!dpRes.ok) throw new Error(`Dayparts HTTP ${dpRes.status}`);
                setDayparts((await dpRes.json()) as Daypart[]);

                const stRes = await fetch(`${API_BASE}/staffing`);
                if (!stRes.ok) throw new Error(`Staffing HTTP ${stRes.status}`);
                setRows((await stRes.json()) as StaffingRow[]);
            } catch (e) {
                setError(String(e));
            }
        }
        load();
    }, []);

    const daypartMap = useMemo(() => {
        const m = new Map<number, string>();
        dayparts.forEach((d) => m.set(d.id, d.label));
        return m;
    }, [dayparts]);

    function addRow() {
        if (dayparts.length === 0) return;
        setRows((prev) => [
            ...prev,
            {
                weekday: 0,
                daypart_id: dayparts[0].id,
                role: "kitchen",
                staff_count: 0,
                hourly_rate: 0,
                hours_in_daypart: 0,
            },
        ]);
    }

    async function saveAll() {
        setSaving(true);
        setError(null);
        try {
            const payload = rows.map((r) => ({
                weekday: r.weekday,
                daypart_id: r.daypart_id,
                role: r.role,
                staff_count: Number(r.staff_count),
                hourly_rate: Number(r.hourly_rate),
                hours_in_daypart: Number(r.hours_in_daypart),
            }));
            const res = await fetch(`${API_BASE}/staffing`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setRows((await res.json()) as StaffingRow[]);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1000 }}>
            <button onClick={props.onBack}>← Back</button>
            <h1>Staffing plan</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={addRow} disabled={dayparts.length === 0}>Add row</button>
                <button onClick={saveAll} disabled={saving}>{saving ? "Saving…" : "Save all"}</button>
            </div>

            {dayparts.length === 0 ? (
                <p>Create dayparts first.</p>
            ) : rows.length === 0 ? (
                <p>No staffing rows yet. Click “Add row”.</p>
            ) : (
                <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        <th>Weekday</th>
                        <th>Daypart</th>
                        <th>Role</th>
                        <th>Staff</th>
                        <th>Hourly rate</th>
                        <th>Hours in daypart</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td>
                                <select
                                    value={r.weekday}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, weekday: v } : x)));
                                    }}
                                >
                                    {WEEKDAYS.map((w, i) => (
                                        <option key={w} value={i}>{w}</option>
                                    ))}
                                </select>
                            </td>

                            <td>
                                <select
                                    value={r.daypart_id}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, daypart_id: v } : x)));
                                    }}
                                >
                                    {dayparts.map((d) => (
                                        <option key={d.id} value={d.id}>{d.label}</option>
                                    ))}
                                </select>
                            </td>

                            <td>
                                <select
                                    value={r.role}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, role: v } : x)));
                                    }}
                                >
                                    <option value="kitchen">kitchen</option>
                                    <option value="service">service</option>
                                </select>
                            </td>

                            <td>
                                <input
                                    type="number"
                                    value={r.staff_count}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, staff_count: v } : x)));
                                    }}
                                    style={{ width: 90 }}
                                />
                            </td>

                            <td>
                                <input
                                    type="number"
                                    value={r.hourly_rate}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, hourly_rate: v } : x)));
                                    }}
                                    style={{ width: 120 }}
                                />
                            </td>

                            <td>
                                <input
                                    type="number"
                                    step="0.25"
                                    value={r.hours_in_daypart}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, hours_in_daypart: v } : x)));
                                    }}
                                    style={{ width: 140 }}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
                Tip: For BP MVP we store staffing as rows. Later you can generate a full 7×daypart×role grid.
            </div>
        </div>
    );
}