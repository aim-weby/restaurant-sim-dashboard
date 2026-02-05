import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek } from "../api/types";

export default function BaselineWeeksPage() {
    const nav = useNavigate();
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [weekStart, setWeekStart] = useState("2026-02-03");
    const [label, setLabel] = useState("Test week");

    async function load() {
        setError(null);
        try {
            setWeeks(await api.listWeeks());
        } catch (e) {
            setError(String(e));
        }
    }

    async function create() {
        setError(null);
        try {
            const w = await api.createWeek({ week_start: weekStart, label });
            await load();
            nav(`/baseline-weeks/${w.id}/grid`);
        } catch (e) {
            setError(String(e));
        }
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <h1>Baseline weeks</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 12 }}>
                <h3 style={{ marginTop: 0 }}>Create new week</h3>
                <label style={{ display: "block", marginTop: 8 }}>
                    Week start (YYYY-MM-DD)
                    <input value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </label>
                <label style={{ display: "block", marginTop: 8 }}>
                    Label
                    <input value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </label>
                <button onClick={create} style={{ marginTop: 10 }}>Create</button>
            </div>

            <div style={{ marginTop: 16 }}>
                <h3>Existing weeks</h3>
                {weeks.length === 0 ? (
                    <p>No weeks yet.</p>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {weeks.map((w) => (
                            <div key={w.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontWeight: 700 }}>{w.label}</div>
                                <div style={{ color: "#666", fontSize: 12 }}>id: {w.id} · week_start: {w.week_start}</div>

                                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/grid`)}>Open grid</button>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/kpis`)}>View KPI</button>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/scenarios`)}>Scenarios</button>
                                    <button onClick={() => nav(`/simulation?weekId=${w.id}`)}>Simulate</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}