import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek } from "../api/types";

export default function ReportPage() {
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                setWeeks(await api.listWeeks());
            } catch (e) {
                setError(String(e));
            }
        }
        load();
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <h1>Report</h1>
            <p style={{ color: "#666" }}>
                One page summary for BP: choose a baseline week, view KPI, scenarios and (later) AI insights.
            </p>

            {error && <p style={{ color: "crimson" }}>{error}</p>}

            {weeks.length === 0 ? (
                <p>No baseline weeks yet.</p>
            ) : (
                <div style={{ display: "grid", gap: 10 }}>
                    {weeks.map((w) => (
                        <div key={w.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                            <div style={{ fontWeight: 700 }}>{w.label}</div>
                            <div style={{ color: "#666", fontSize: 12 }}>week_start: {w.week_start} · id: {w.id}</div>

                            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                                <Link to={`/baseline-weeks/${w.id}/grid`}>Grid</Link>
                                <Link to={`/baseline-weeks/${w.id}/kpis`}>KPI</Link>
                                <Link to={`/baseline-weeks/${w.id}/scenarios`}>Scenarios</Link>
                            </div>

                            <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                                <b>AI insight (placeholder)</b>
                                <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                                    Here we will generate a narrative summary: key strengths/risks, what drives profit,
                                    and recommended experiments.
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}