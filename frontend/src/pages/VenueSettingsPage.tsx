import { useEffect, useState } from "react";

type Venue = {
    id: number;
    name: string;
    timezone: string;
    currency: string;
    seats_total: number;
    tables_count: number;
    mode: string;
};

const API_BASE = "http://127.0.0.1:8000";

export default function VenueSettingsPage() {
    const [venue, setVenue] = useState<Venue | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/venue`)
            .then((r) => r.json())
            .then(setVenue)
            .catch((e) => setError(String(e)));
    }, []);

    async function onSave() {
        if (!venue) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/venue`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: venue.name,
                    timezone: venue.timezone,
                    currency: venue.currency,
                    seats_total: venue.seats_total,
                    tables_count: venue.tables_count,
                    mode: venue.mode,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const updated = (await res.json()) as Venue;
            setVenue(updated);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
    if (!venue) return <div style={{ padding: 24 }}>Loading…</div>;

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 640 }}>
            <h1>Venue settings</h1>

            <label style={{ display: "block", marginTop: 12 }}>
                Name
                <input
                    style={{ width: "100%", padding: 8 }}
                    value={venue.name}
                    onChange={(e) => setVenue({ ...venue, name: e.target.value })}
                />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
                Timezone
                <input
                    style={{ width: "100%", padding: 8 }}
                    value={venue.timezone}
                    onChange={(e) => setVenue({ ...venue, timezone: e.target.value })}
                />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
                Currency
                <input
                    style={{ width: "100%", padding: 8 }}
                    value={venue.currency}
                    onChange={(e) => setVenue({ ...venue, currency: e.target.value })}
                />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
                Seats total
                <input
                    type="number"
                    style={{ width: "100%", padding: 8 }}
                    value={venue.seats_total}
                    onChange={(e) =>
                        setVenue({ ...venue, seats_total: Number(e.target.value) })
                    }
                />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
                Tables count
                <input
                    type="number"
                    style={{ width: "100%", padding: 8 }}
                    value={venue.tables_count}
                    onChange={(e) =>
                        setVenue({ ...venue, tables_count: Number(e.target.value) })
                    }
                />
            </label>

            <label style={{ display: "block", marginTop: 12 }}>
                Mode
                <select
                    style={{ width: "100%", padding: 8 }}
                    value={venue.mode}
                    onChange={(e) => setVenue({ ...venue, mode: e.target.value })}
                >
                    <option value="dinein">dinein</option>
                    <option value="delivery_only">delivery_only</option>
                </select>
            </label>

            <button
                onClick={onSave}
                disabled={saving}
                style={{ marginTop: 16, padding: "10px 14px" }}
            >
                {saving ? "Saving…" : "Save"}
            </button>

            {error && <p style={{ color: "crimson" }}>{error}</p>}
        </div>
    );
}