import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type KpisResponse = {
    baseline_week_id: number;
    kpis: Record<string, number>;
};

export default function BaselineKpisPage(props: { weekId: number; onBack: () => void }) {
    const [data, setData] = useState<KpisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/baseline-weeks/${props.weekId}/kpis`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as KpisResponse;
                setData(json);
            } catch (e) {
                setError(String(e));
            }
        }
        load();
    }, [props.weekId]);

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
            <button onClick={props.onBack}>← Back</button>
            <h1>Baseline KPI (week #{props.weekId})</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {!data ? (
                <p>Loading…</p>
            ) : (
                <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Object.entries(data.kpis).map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td><code>{k}</code></td>
                            <td>{Number.isFinite(v) ? v : "-"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}