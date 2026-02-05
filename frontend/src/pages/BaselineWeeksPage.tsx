import { useEffect, useState } from "react";

type BaselineWeek = { id: number; week_start: string; label: string };

const API_BASE = "http://127.0.0.1:8000";

export default function BaselineWeeksPage(props: { onOpenWeek: (id: number) => void }) {
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [weekStart, setWeekStart] = useState("2026-02-02"); // změň si
    const [label, setLabel] = useState("Baseline week");
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        const res = await fetch(`${API_BASE}/baseline-weeks`);
        const data = (await res.json()) as BaselineWeek[];
        setWeeks(data);
    }

    useEffect(() => { load(); }, []);

    async function createWeek() {
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/baseline-weeks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ week_start: weekStart, label }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
            <h1>Baseline weeks</h1>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Create week</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8 }}>
                    <input value={weekStart} onChange={(e) => setWeekStart(e.target.value)} placeholder="YYYY-MM-DD" />
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
                    <button onClick={createWeek}>Create</button>
                </div>
                {error && <p style={{ color: "crimson" }}>{error}</p>}
            </div>

            <div style={{ marginTop: 16 }}>
                <h3>Existing</h3>
                {weeks.length === 0 ? (
                    <p>No baseline weeks yet.</p>
                ) : (
                    <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                        <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                            <th>Week start</th>
                            <th>Label</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {weeks.map((w) => (
                            <tr key={w.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td>{w.week_start}</td>
                                <td>{w.label}</td>
                                <td>
                                    <button onClick={() => props.onOpenWeek(w.id)}>Open grid</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}