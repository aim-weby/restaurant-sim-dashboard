import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { SimulationParams } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

type Field = {
    key: keyof Omit<SimulationParams, "id" | "baseline_week_id">;
    label: string;
    hint?: string;
    step?: number;
    min?: number;
    max?: number;
    group: string;
};

const FIELDS: Field[] = [
    { key: "prep_time_min", label: "Min (min)", hint: "Minimum kitchen prep time", step: 0.5, min: 0, group: "Kitchen Prep Time (triangular)" },
    { key: "prep_time_mode", label: "Mode (min)", hint: "Most likely kitchen prep time", step: 0.5, min: 0, group: "Kitchen Prep Time (triangular)" },
    { key: "prep_time_max", label: "Max (min)", hint: "Maximum kitchen prep time", step: 0.5, min: 0, group: "Kitchen Prep Time (triangular)" },
    { key: "seat_time_min", label: "Min (min)", hint: "Minimum dine-in seat time", step: 1, min: 0, group: "Seat Time (triangular)" },
    { key: "seat_time_mode", label: "Mode (min)", hint: "Most likely dine-in seat time", step: 1, min: 0, group: "Seat Time (triangular)" },
    { key: "seat_time_max", label: "Max (min)", hint: "Maximum dine-in seat time", step: 1, min: 0, group: "Seat Time (triangular)" },
    { key: "alpha_seat_wait", label: "Alpha coefficient", hint: "seat_time += alpha × kitchen_wait. 0 = off.", step: 0.05, min: 0, max: 1, group: "Behavioral Parameters" },
    { key: "balking_wait_table_limit", label: "Table wait limit (min)", hint: "0 = disabled", step: 1, min: 0, group: "Behavioral Parameters" },
    { key: "balking_wait_food_limit", label: "Food wait limit (min)", hint: "0 = disabled", step: 1, min: 0, group: "Behavioral Parameters" },
    { key: "price_elasticity", label: "Elasticity", hint: "e.g. −1.2 → +10% price ≈ −12% demand", step: 0.1, group: "Demand & Price" },
    { key: "demand_noise_pct", label: "Noise ±%", hint: "0.20 = ±20% random variation", step: 0.05, min: 0, max: 1, group: "Demand & Price" },
];

const groups = [...new Set(FIELDS.map((f) => f.group))];

export default function SimParamsPage() {
    const { weekId } = useParams<{ weekId: string }>();
    const week = Number(weekId);
    const [data, setData] = useState<SimulationParams | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!week) return;
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
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    if (error && !data) return <div className="p-6 text-red-600">Error: {error}</div>;
    if (!data) return <div className="p-6 text-grey animate-pulse">Loading…</div>;

    return (
        <div className="max-w-2xl">
            <PageHeader
                title="Simulation Parameters"
                subtitle="Triangular distributions, balking, price elasticity, and demand noise for the DES engine."
            >
                <Link
                    to={`/baseline-weeks/${weekId}/dashboard`}
                    className="text-sm text-deep-blue hover:underline"
                >
                    ← Dashboard
                </Link>
            </PageHeader>

            <div className="space-y-6">
                {groups.map((group) => (
                    <Card key={group} className="p-5">
                        <h3 className="text-sm font-semibold text-mariana mb-4">{group}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {FIELDS.filter((f) => f.group === group).map((f) => (
                                <div key={f.key}>
                                    <label className="block text-xs font-medium text-grey mb-1">
                                        {f.label}
                                    </label>
                                    <input
                                        type="number"
                                        step={f.step ?? 0.01}
                                        min={f.min}
                                        max={f.max}
                                        value={data[f.key]}
                                        onChange={(e) => setData({ ...data, [f.key]: Number(e.target.value) })}
                                    />
                                    {f.hint && <p className="mt-0.5 text-[10px] text-grey/70">{f.hint}</p>}
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3 mt-5">
                <Button onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save Parameters"}
                </Button>
                {saved && (
                    <span className="text-sm text-algae-dark font-medium animate-pulse">✓ Saved</span>
                )}
            </div>
        </div>
    );
}
