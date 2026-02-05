import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type KpisResponse = {
    baseline_week_id: number;
    kpis: Record<string, number>;
    inputs_used?: Record<string, number>;
};

function formatValue(metric: string, value: number) {
    if (metric.startsWith("finance.") && !metric.endsWith("_ratio") && !metric.endsWith("_margin")) {
        return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(value);
    }
    if (metric.endsWith("_ratio") || metric.endsWith("_margin")) {
        return `${(value * 100).toFixed(1)} %`;
    }
    return value.toFixed(2);
}

const PRIMARY = [
    "finance.revenue",
    "finance.profit",
    "finance.cogs",
    "finance.labor_cost",
    "finance.fixed_cost",
    "finance.profit_margin",
    "finance.prime_cost_ratio",
    "finance.labor_cost_ratio",
    "demand.arrivals_groups",
];

export default function BaselineKpisPage(props: { weekId: number; onBack: () => void }) {
    const [data, setData] = useState<KpisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/baseline-weeks/${props.weekId}/kpis`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setData((await res.json()) as KpisResponse);
            } catch (e) {
                setError(String(e));
            }
        }
        load();
    }, [props.weekId]);

    const rows = useMemo(() => {
        if (!data) return [];
        const kpis = data.kpis ?? {};
        const keys = PRIMARY.filter((k) => k in kpis);
        return keys.map((k) => ({ key: k, value: kpis[k] }));
    }, [data]);

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
            <button onClick={props.onBack}>← Back</button>
            <h1>Baseline KPI (week #{props.weekId})</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {!data ? (
                <p>Loading…</p>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
                        {rows.map((r) => (
                            <div key={r.key} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                                <div style={{ color: "#666", fontSize: 12 }}>{r.key}</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatValue(r.key, r.value)}</div>
                            </div>
                        ))}
                    </div>

                    {data.inputs_used && (
                        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                            <b>Inputs used</b>
                            <pre style={{ margin: 0, marginTop: 8, background: "#fafafa", padding: 10, borderRadius: 8 }}>
                {JSON.stringify(data.inputs_used, null, 2)}
              </pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}