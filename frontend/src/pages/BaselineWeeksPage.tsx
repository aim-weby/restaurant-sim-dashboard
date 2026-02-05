import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek } from "../api/types";

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

export default function BaselineWeeksPage() {
    const nav = useNavigate();
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [weekStart, setWeekStart] = useState("2026-02-03");
    const [label, setLabel] = useState("Test week");

    async function load() {
        setError(null);
        setLoading(true);
        try {
            setWeeks(await api.listWeeks());
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    async function create() {
        setError(null);
        try {
            const w = await api.createWeek({ week_start: weekStart, label });
            await load();
            // UX: po vytvoření jdi rovnou na dashboard
            nav(`/baseline-weeks/${w.id}/dashboard`);
        } catch (e) {
            setError(String(e));
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 980, fontFamily: "system-ui" }}>
            <div
                style={{
                    borderRadius: 18,
                    padding: 18,
                    background:
                        "radial-gradient(1200px 600px at 20% 0%, rgba(0,153,255,0.22), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(255,0,122,0.16), transparent 55%)",
                    border: "1px solid rgba(255,255,255,0.3)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#666" }}>Baseline</div>
                        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Baseline weeks</div>
                        <div style={{ marginTop: 4, color: "#666" }}>
                            Create a baseline week, fill the grid, and use dashboard & simulations.
                        </div>
                    </div>

                    <button onClick={load} disabled={loading} style={{ padding: "10px 12px", borderRadius: 12 }}>
                        {loading ? "Reloading…" : "Reload"}
                    </button>
                </div>
            </div>

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

            {/* Create new week */}
            <div style={{ ...cardStyle(), marginTop: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Create new week</div>
                <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                    Tip: week_start should be Monday (but BP MVP doesn’t enforce it).
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        Week start (YYYY-MM-DD)
                        <input value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        Label
                        <input value={label} onChange={(e) => setLabel(e.target.value)} style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }} />
                    </label>

                    <button onClick={create} style={{ padding: "10px 14px", borderRadius: 12 }}>
                        Create
                    </button>
                </div>
            </div>

            {/* Existing weeks */}
            <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>Existing weeks</h3>
                    <div style={{ color: "#666", fontSize: 12 }}>
                        {weeks.length} total
                    </div>
                </div>

                {loading ? (
                    <p style={{ marginTop: 10 }}>Loading…</p>
                ) : weeks.length === 0 ? (
                    <p style={{ marginTop: 10 }}>No weeks yet.</p>
                ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                        {weeks.map((w) => (
                            <div key={w.id} style={cardStyle()}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: 16 }}>{w.label}</div>
                                        <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                                            id: {w.id} · week_start: {w.week_start}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => nav(`/baseline-weeks/${w.id}/dashboard`)}
                                        style={{ padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}
                                    >
                                        Open dashboard →
                                    </button>
                                </div>

                                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/grid`)}>Grid</button>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/kpis`)}>KPI</button>
                                    <button onClick={() => nav(`/baseline-weeks/${w.id}/scenarios`)}>Scenarios</button>
                                    <button onClick={() => nav(`/simulation?weekId=${w.id}`)}>Simulation</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}