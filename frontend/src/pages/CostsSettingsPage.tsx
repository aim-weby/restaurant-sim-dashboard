import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type Costs = {
    id: number;
    fixed_cost_week: number;
    food_cost_pct: number; // 0..1
};

export default function CostsSettingsPage(props: { onBack: () => void }) {
    const [data, setData] = useState<Costs | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/settings/costs`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setData((await res.json()) as Costs);
            } catch (e) {
                setError(String(e));
            }
        }
        load();
    }, []);

    async function save() {
        if (!data) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/settings/costs`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fixed_cost_week: Number(data.fixed_cost_week),
                    food_cost_pct: Number(data.food_cost_pct),
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData((await res.json()) as Costs);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 700 }}>
            <button onClick={props.onBack}>← Back</button>
            <h1>Cost settings</h1>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {!data ? (
                <p>Loading…</p>
            ) : (
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                    <label style={{ display: "block", marginTop: 8 }}>
                        Fixed cost / week (CZK)
                        <input
                            type="number"
                            value={data.fixed_cost_week}
                            onChange={(e) => setData({ ...data, fixed_cost_week: Number(e.target.value) })}
                            style={{ width: "100%", padding: 8 }}
                        />
                    </label>

                    <label style={{ display: "block", marginTop: 12 }}>
                        Food cost % (0–1)
                        <input
                            type="number"
                            step="0.01"
                            value={data.food_cost_pct}
                            onChange={(e) => setData({ ...data, food_cost_pct: Number(e.target.value) })}
                            style={{ width: "100%", padding: 8 }}
                        />
                        <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                            Example: 0.30 = 30%
                        </div>
                    </label>

                    <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: "10px 14px" }}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            )}
        </div>
    );
}