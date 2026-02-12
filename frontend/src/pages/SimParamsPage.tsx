import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { SimulationParams } from "../api/types";

type Field = {
    key: keyof Omit<SimulationParams, "id" | "baseline_week_id">;
    label: string;
    hint?: string;
    step?: number;
    min?: number;
    max?: number;
};

const FIELDS: Field[] = [
    { key: "prep_time_min", label: "Prep time — min (min)", hint: "Minimum kitchen prep time", step: 0.5, min: 0 },
    { key: "prep_time_mode", label: "Prep time — mode (min)", hint: "Most likely kitchen prep time", step: 0.5, min: 0 },
    { key: "prep_time_max", label: "Prep time — max (min)", hint: "Maximum kitchen prep time", step: 0.5, min: 0 },
    { key: "seat_time_min", label: "Seat time — min (min)", hint: "Minimum dine-in seat time", step: 1, min: 0 },
    { key: "seat_time_mode", label: "Seat time — mode (min)", hint: "Most likely dine-in seat time", step: 1, min: 0 },
    { key: "seat_time_max", label: "Seat time — max (min)", hint: "Maximum dine-in seat time", step: 1, min: 0 },
    { key: "alpha_seat_wait", label: "Alpha seat–wait", hint: "seat_time += alpha × kitchen_wait. 0 = no correlation.", step: 0.05, min: 0, max: 1 },
    { key: "balking_wait_table_limit", label: "Balking — table wait limit (min)", hint: "0 = disabled", step: 1, min: 0 },
    { key: "balking_wait_food_limit", label: "Balking — food wait limit (min)", hint: "0 = disabled", step: 1, min: 0 },
    { key: "price_elasticity", label: "Price elasticity", hint: "e.g. −1.2 → +10 % price ≈ −12 % demand", step: 0.1 },
    { key: "demand_noise_pct", label: "Demand noise ±%", hint: "0.20 = ±20 % random variation per daypart", step: 0.05, min: 0, max: 1 },
];

export default function SimParamsPage() {
    const { weekId } = useParams<{ weekId: string }>();
    const week = Number(weekId);
    const [data, setData] = useState<SimulationParams | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!week) return;
        setError(null);
        api.getSimParams(week).then(setData).catch((e) => setError(String(e)));
    }, [week]);

    async function save() {
        if (!data) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const { id: _, baseline_week_id: __, ...payload } = data;
            const updated = await api.updateSimParams(week, payload);
            setData(updated);
            setSaved(true);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 700 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/baseline-weeks">← Weeks</Link>
                {weekId && <Link to={`/baseline-weeks/${weekId}/dashboard`}>Dashboard →</Link>}
            </div>

            <h1>Simulation parameters</h1>
            <p style={{ color: "#666", marginTop: -8 }}>
                Triangular distribution times, balking limits, price elasticity, and demand noise for the DES simulation.
            </p>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {!data ? (
                <p>Loading…</p>
            ) : (
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
                    {FIELDS.map((f) => (
                        <label key={f.key} style={{ display: "block", marginTop: 12 }}>
                            {f.label}
                            <input
                                type="number"
                                step={f.step ?? 0.01}
                                min={f.min}
                                max={f.max}
                                value={data[f.key]}
                                onChange={(e) => setData({ ...data, [f.key]: Number(e.target.value) })}
                                style={{ width: "100%", padding: 8 }}
                            />
                            {f.hint && <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{f.hint}</div>}
                        </label>
                    ))}

                    <button onClick={save} disabled={saving} style={{ marginTop: 20, padding: "10px 16px" }}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                    {saved && <span style={{ color: "green", marginLeft: 12 }}>✓ Saved</span>}
                </div>
            )}
        </div>
    );
}
