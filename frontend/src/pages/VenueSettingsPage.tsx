import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Venue } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function VenueSettingsPage() {
    const [venue, setVenue] = useState<Venue | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getVenue().then(setVenue).catch((e) => setError(String(e)));
    }, []);

    async function onSave() {
        if (!venue) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const updated = await api.updateVenue({
                name: venue.name,
                timezone: venue.timezone,
                currency: venue.currency,
                seats_total: Number(venue.seats_total),
                tables_count: Number(venue.tables_count),
                mode: venue.mode,
            });
            setVenue(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    if (error && !venue) return <div className="p-6 text-red-600">Error: {error}</div>;
    if (!venue) return <div className="p-6 text-grey animate-pulse">Loading…</div>;

    const fields = [
        { label: "Restaurant Name", key: "name" as const, type: "text" },
        { label: "Timezone", key: "timezone" as const, type: "text" },
        { label: "Currency", key: "currency" as const, type: "text" },
        { label: "Total Seats", key: "seats_total" as const, type: "number" },
        { label: "Table Count", key: "tables_count" as const, type: "number" },
    ];

    return (
        <div className="max-w-xl">
            <PageHeader title="Venue Settings" subtitle="Configure your restaurant's basic parameters" />

            <Card className="p-6">
                <div className="space-y-5">
                    {fields.map(({ label, key, type }) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-mariana mb-1.5">{label}</label>
                            <input
                                type={type}
                                value={venue[key]}
                                onChange={(e) =>
                                    setVenue({
                                        ...venue,
                                        [key]: type === "number" ? Number(e.target.value) : e.target.value,
                                    })
                                }
                            />
                        </div>
                    ))}

                    <div>
                        <label className="block text-sm font-medium text-mariana mb-1.5">Operating Mode</label>
                        <select
                            value={venue.mode}
                            onChange={(e) => setVenue({ ...venue, mode: e.target.value })}
                        >
                            <option value="dinein">Dine-in</option>
                            <option value="delivery_only">Delivery Only</option>
                        </select>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex items-center gap-3 pt-2">
                        <Button onClick={onSave} disabled={saving}>
                            {saving ? "Saving…" : "Save Settings"}
                        </Button>
                        {saved && (
                            <span className="text-sm text-algae-dark font-medium animate-pulse">
                                ✓ Saved
                            </span>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}