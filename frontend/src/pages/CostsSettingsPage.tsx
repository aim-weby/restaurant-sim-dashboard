import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Costs } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function CostsSettingsPage() {
    const [data, setData] = useState<Costs | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.getCosts().then(setData).catch((e) => setError(String(e)));
    }, []);

    async function save() {
        if (!data) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const updated = await api.updateCosts({
                fixed_cost_week: Number(data.fixed_cost_week),
                food_cost_pct: Number(data.food_cost_pct),
            });
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
        <div className="max-w-xl">
            <PageHeader title="Cost Settings" subtitle="Fixed weekly costs and food cost percentage" />

            <Card className="p-6">
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-mariana mb-1.5">
                            Fixed Cost / Week (CZK)
                        </label>
                        <input
                            type="number"
                            value={data.fixed_cost_week}
                            onChange={(e) => setData({ ...data, fixed_cost_week: Number(e.target.value) })}
                        />
                        <p className="mt-1 text-xs text-grey">Rent, utilities, insurance, etc.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-mariana mb-1.5">
                            Food Cost %
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={data.food_cost_pct}
                            onChange={(e) => setData({ ...data, food_cost_pct: Number(e.target.value) })}
                        />
                        <p className="mt-1 text-xs text-grey">
                            As a decimal: 0.30 = 30%. Industry average is 0.28–0.35.
                        </p>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex items-center gap-3 pt-2">
                        <Button onClick={save} disabled={saving}>
                            {saving ? "Saving…" : "Save Costs"}
                        </Button>
                        {saved && (
                            <span className="text-sm text-algae-dark font-medium animate-pulse">✓ Saved</span>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}