import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { ExperimentResult, ExperimentsResponse } from "../api/types";
import { sectionStyle, cardStyle } from "../utils/styles";

const METRICS = [
    { key: "revenue", label: "Revenue", fmt: (v: number) => `${v.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK` },
    { key: "profit", label: "Profit", fmt: (v: number) => `${v.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK` },
    { key: "served_groups", label: "Served groups", fmt: (v: number) => v.toFixed(1) },
    { key: "lost_groups", label: "Lost groups", fmt: (v: number) => v.toFixed(2) },
    { key: "avg_wait_food", label: "Avg wait (food)", fmt: (v: number) => `${v.toFixed(1)} min` },
    { key: "p90_wait_food", label: "P90 wait (food)", fmt: (v: number) => `${v.toFixed(1)} min` },
    { key: "util_kitchen", label: "Kitchen util.", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
];

export default function ExperimentsPage() {
    const [searchParams] = useSearchParams();
    const weekId = Number(searchParams.get("weekId") || 1);

    const [data, setData] = useState<ExperimentsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState(200);
    const [seed, setSeed] = useState(42);
    const [elapsed, setElapsed] = useState<number | null>(null);

    async function runAll() {
        setLoading(true);
        setElapsed(null);
        const t0 = Date.now();
        try {
            const res = await api.runExperiments(weekId, runs, seed);
            setData(res);
            setElapsed(Math.round((Date.now() - t0) / 1000));
        } catch (e) {
            alert(`Error: ${e}`);
        } finally {
            setLoading(false);
        }
    }

    function exportJson() {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `experiments_week${weekId}_${runs}runs.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportCsv() {
        if (!data) return;
        const header = ["experiment", ...METRICS.map(m => m.label), ...METRICS.map(m => `Δ ${m.label}`), ...METRICS.map(m => `Δ% ${m.label}`)];
        const rows = data.experiments.map(exp => {
            const vals = METRICS.map(m => exp.summary[m.key]?.mean ?? 0);
            const deltas = METRICS.map(m => exp.deltas?.[m.key]?.delta ?? 0);
            const deltaPcts = METRICS.map(m => exp.deltas?.[m.key]?.delta_pct ?? 0);
            return [exp.name, ...vals, ...deltas, ...deltaPcts].join(",");
        });
        const csv = [header.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `experiments_week${weekId}_${runs}runs.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const deltaColor = (v: number, metric: string) => {
        // For wait and lost metrics, lower is better (negative delta = green)
        const inverted = ["avg_wait_food", "p90_wait_food", "lost_groups"].includes(metric);
        if (v === 0) return "#888";
        const isGood = inverted ? v < 0 : v > 0;
        return isGood ? "#16a34a" : "#dc2626";
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>BP Experiment Runner</h1>
            <p style={{ color: "#666", fontSize: 13, margin: "6px 0 20px" }}>
                Runs 6 predefined scenarios from the thesis spec (Section 13) against baseline week #{weekId}.
                Results are reproducible (fixed seed) and exportable for thesis appendix.
            </p>

            <div style={{ ...sectionStyle(), display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 13 }}>
                    Runs per experiment:
                    <input
                        type="number"
                        value={runs}
                        onChange={(e) => setRuns(Math.max(10, Number(e.target.value)))}
                        style={{ width: 80, marginLeft: 8, padding: "4px 8px" }}
                    />
                </label>
                <label style={{ fontSize: 13 }}>
                    Seed:
                    <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                        style={{ width: 80, marginLeft: 8, padding: "4px 8px" }}
                    />
                </label>
                <button onClick={runAll} disabled={loading} style={{ padding: "8px 16px", fontWeight: 700 }}>
                    {loading ? "Running experiments…" : "Run all experiments"}
                </button>
                {elapsed !== null && (
                    <span style={{ color: "#666", fontSize: 12 }}>
                        Completed in {elapsed}s ({data?.experiment_count} experiments × {runs} runs)
                    </span>
                )}
            </div>

            {data && (
                <>
                    {/* Export buttons */}
                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                        <button onClick={exportJson} style={{ padding: "6px 12px", fontSize: 12 }}>
                            Export JSON
                        </button>
                        <button onClick={exportCsv} style={{ padding: "6px 12px", fontSize: 12 }}>
                            Export CSV
                        </button>
                    </div>

                    {/* Experiment cards */}
                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                        {data.experiments.map((exp: ExperimentResult) => (
                            <div key={exp.id} style={sectionStyle()}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 15 }}>{exp.name}</div>
                                        <div style={{ color: "#666", fontSize: 12 }}>{exp.description}</div>
                                    </div>
                                    {exp.id === "baseline" && (
                                        <span style={{ fontSize: 11, color: "#888", border: "1px solid #ddd", borderRadius: 6, padding: "2px 8px" }}>
                                            REFERENCE
                                        </span>
                                    )}
                                </div>

                                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: `repeat(${METRICS.length}, 1fr)`, gap: 8 }}>
                                    {METRICS.map(m => {
                                        const mean = exp.summary[m.key]?.mean ?? 0;
                                        const delta = exp.deltas?.[m.key];
                                        return (
                                            <div key={m.key} style={cardStyle()}>
                                                <div style={{ color: "#666", fontSize: 11 }}>{m.label}</div>
                                                <div style={{ fontSize: 16, fontWeight: 800 }}>{m.fmt(mean)}</div>
                                                {delta && (
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: deltaColor(delta.delta, m.key), marginTop: 2 }}>
                                                        {delta.delta >= 0 ? "+" : ""}{m.fmt(delta.delta)} ({delta.delta_pct >= 0 ? "+" : ""}{delta.delta_pct.toFixed(1)}%)
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comparison matrix table */}
                    <div style={{ ...sectionStyle(), marginTop: 16, overflow: "auto" }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                            Comparison Matrix (mean values + Δ%)
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee" }}>Scenario</th>
                                    {METRICS.map(m => (
                                        <th key={m.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "2px solid #eee" }}>
                                            {m.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.experiments.map((exp) => (
                                    <tr key={exp.id} style={{ background: exp.id === "baseline" ? "rgba(99,102,241,0.04)" : "transparent" }}>
                                        <td style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}>
                                            {exp.name}
                                        </td>
                                        {METRICS.map(m => {
                                            const mean = exp.summary[m.key]?.mean ?? 0;
                                            const delta = exp.deltas?.[m.key];
                                            return (
                                                <td key={m.key} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #f0f0f0" }}>
                                                    {m.fmt(mean)}
                                                    {delta && (
                                                        <span style={{ marginLeft: 6, color: deltaColor(delta.delta, m.key), fontSize: 10, fontWeight: 600 }}>
                                                            ({delta.delta_pct >= 0 ? "+" : ""}{delta.delta_pct.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
