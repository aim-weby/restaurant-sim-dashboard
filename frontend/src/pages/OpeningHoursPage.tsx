import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { OpeningHoursItem } from "../api/types";
import { useToast } from "../components/Toast";
import { WEEKDAYS_FULL } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function OpeningHoursPage() {
    const toast = useToast();
    const [rows, setRows] = useState<OpeningHoursItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.getOpeningHours()
            .then(setRows)
            .catch((e) => toast.error(`Failed to load hours: ${e}`));
    }, []);

    function update(weekday: number, field: keyof OpeningHoursItem, value: string | boolean) {
        setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r)));
        setDirty(true);
        setSaved(false);
    }

    async function save() {
        setSaving(true);
        try {
            const res = await api.updateOpeningHours(
                rows.map((r) => ({
                    weekday: r.weekday,
                    open_time: r.open_time,
                    close_time: r.close_time,
                    is_closed: r.is_closed,
                }))
            );
            setRows(res);
            setDirty(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            toast.success("Opening hours saved!");
        } catch (e) {
            toast.error(`Error saving: ${e}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl">
            <PageHeader title="Opening Hours" subtitle="Set opening and closing times for each day of the week" />

            <Card className="overflow-hidden">
                <table>
                    <thead>
                        <tr>
                            <th className="!pl-5">Day</th>
                            <th className="text-center">Open</th>
                            <th className="text-center">Close</th>
                            <th className="text-center">Closed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.weekday} className={r.is_closed ? "opacity-40" : ""}>
                                <td className="!pl-5 font-semibold text-mariana">
                                    {WEEKDAYS_FULL[r.weekday]}
                                </td>
                                <td className="text-center">
                                    <input
                                        type="time"
                                        value={r.open_time}
                                        disabled={r.is_closed}
                                        onChange={(e) => update(r.weekday, "open_time", e.target.value)}
                                        className="!w-auto text-center"
                                    />
                                </td>
                                <td className="text-center">
                                    <input
                                        type="time"
                                        value={r.close_time}
                                        disabled={r.is_closed}
                                        onChange={(e) => update(r.weekday, "close_time", e.target.value)}
                                        className="!w-auto text-center"
                                    />
                                </td>
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={r.is_closed}
                                        onChange={(e) => update(r.weekday, "is_closed", e.target.checked)}
                                        className="w-4 h-4 rounded border-grey/50 text-deep-blue focus:ring-deep-blue/30 cursor-pointer"
                                    />
                                </td>
                                {!r.is_closed && r.close_time <= r.open_time && (
                                    <td className="text-xs text-red-500 !border-0">Close must be after open</td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <div className="flex items-center gap-3 mt-4">
                <Button onClick={save} disabled={saving || !dirty}>
                    {saving ? "Saving…" : "Save Hours"}
                </Button>
                {saved && (
                    <span className="text-sm text-algae-dark font-medium animate-pulse">✓ Saved</span>
                )}
            </div>
        </div>
    );
}
