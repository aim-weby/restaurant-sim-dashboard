import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Daypart, StaffingRow } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StaffingPage() {
    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [rows, setRows] = useState<StaffingRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        Promise.all([api.listDayparts(), api.listStaffing()])
            .then(([dp, st]) => { setDayparts(dp); setRows(st); })
            .catch((e) => setError(String(e)));
    }, []);

    function addRow() {
        if (dayparts.length === 0) return;
        setRows((prev) => [
            ...prev,
            { weekday: 0, daypart_id: dayparts[0].id, role: "kitchen", staff_count: 0, hourly_rate: 0, hours_in_daypart: 0 },
        ]);
    }

    async function saveAll() {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const payload = rows.map((r) => ({
                weekday: r.weekday, daypart_id: r.daypart_id, role: r.role,
                staff_count: Number(r.staff_count), hourly_rate: Number(r.hourly_rate),
                hours_in_daypart: Number(r.hours_in_daypart),
            }));
            setRows(await api.upsertStaffing(payload));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    function updateRow(idx: number, field: string, value: string | number) {
        setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));
    }

    return (
        <div>
            <PageHeader title="Staffing Plan" subtitle="Define staff counts and wages per weekday, daypart, and role.">
                <Button variant="secondary" onClick={addRow} disabled={dayparts.length === 0} size="sm">
                    + Add Row
                </Button>
                <Button onClick={saveAll} disabled={saving} size="sm">
                    {saving ? "Saving…" : "Save All"}
                </Button>
                {saved && <span className="text-sm text-algae-dark font-medium">✓</span>}
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {dayparts.length === 0 ? (
                <Card className="p-8 text-center text-grey">Create dayparts first before setting up staffing.</Card>
            ) : rows.length === 0 ? (
                <Card className="p-8 text-center text-grey">No staffing rows yet. Click "+ Add Row".</Card>
            ) : (
                <Card className="overflow-x-auto">
                    <table>
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Daypart</th>
                                <th>Role</th>
                                <th>Staff</th>
                                <th>Hourly Rate</th>
                                <th>Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <select value={r.weekday} onChange={(e) => updateRow(idx, "weekday", Number(e.target.value))}>
                                            {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={r.daypart_id} onChange={(e) => updateRow(idx, "daypart_id", Number(e.target.value))}>
                                            {dayparts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={r.role} onChange={(e) => updateRow(idx, "role", e.target.value)}>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number" className="!w-20"
                                            value={r.staff_count}
                                            onChange={(e) => updateRow(idx, "staff_count", Number(e.target.value))}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number" className="!w-28"
                                            value={r.hourly_rate}
                                            onChange={(e) => updateRow(idx, "hourly_rate", Number(e.target.value))}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number" step="0.25" className="!w-24"
                                            value={r.hours_in_daypart}
                                            onChange={(e) => updateRow(idx, "hours_in_daypart", Number(e.target.value))}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            <p className="mt-3 text-xs text-grey">
                Tip: rows are stored per weekday × daypart × role. Duplicates on the same key are merged on save.
            </p>
        </div>
    );
}