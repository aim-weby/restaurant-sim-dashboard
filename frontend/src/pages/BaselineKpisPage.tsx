import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { KpisResponse } from "../api/types";

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

export default function BaselineKpisPage() {
    const { weekId } = useParams();
    const week = Number(weekId);

    const [data, setData] = useState<KpisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                setData(await api.getKpis(week));
            } catch (e) {
                setError(String(e));
            }
        }
        if (Number.isFinite(week)) load();
    }, [week]);

    const rows = useMemo(() => {
        if (!data) return [];
        const kpis = data.kpis ?? {};
        const keys = PRIMARY.filter((k) => k in kpis);
        return keys.map((k) => ({ key: k, value: kpis[k] }));
    }, [data]);

    if (!Number.isFinite(week)) return <div style={{ padding: 24 }}>Invalid weekId.</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <h1>Baseline KPI (week #{week})</h1>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
                <Link to={`/baseline-weeks/${week}/grid`}>Grid</Link>
                <Link to={`/baseline-weeks/${week}/scenarios`}>Scenarios</Link>
                <Link to={`/simulation?weekId=${week}`}>Simulation</Link>
            </div>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {!data ? (
                <p>Loading…</p>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
                        {rows.map((r) => (
                            <div key={r.key} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                                <div style={{ color: "#666", fontSize: 12 }}>{r.key}</div>
                                <div style={{ fontSize: 22, fontWeight: 800 }}>{formatValue(r.key, r.value)}</div>
                            </div>
                        ))}
                    </div>

                    {data.inputs_used && (
                        <details style={{ marginTop: 12 }}>
                            <summary>Inputs used</summary>
                            <pre style={{ background: "#fafafa", padding: 12, borderRadius: 10, overflowX: "auto" }}>
                {JSON.stringify(data.inputs_used, null, 2)}
              </pre>
                        </details>
                    )}
                </>
            )}
        </div>
    );
}