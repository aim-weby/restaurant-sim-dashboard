import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Daypart } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";

export default function DaypartsPage() {
    const [items, setItems] = useState<Daypart[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

    const [newLabel, setNewLabel] = useState("");
    const [newStart, setNewStart] = useState("11:00");
    const [newEnd, setNewEnd] = useState("14:00");
    const newOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;

    async function load() {
        setLoading(true);
        setError(null);
        try {
            setItems(await api.listDayparts());
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    /* ── Overlap detection ── */
    function toMin(t: string) {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function findOverlaps(allItems: { id?: number; start_time: string; end_time: string; label: string }[]) {
        const overlapping = new Set<number | undefined>();
        for (let i = 0; i < allItems.length; i++) {
            for (let j = i + 1; j < allItems.length; j++) {
                const a = allItems[i], b = allItems[j];
                const aStart = toMin(a.start_time), aEnd = toMin(a.end_time);
                const bStart = toMin(b.start_time), bEnd = toMin(b.end_time);
                if (aStart < bEnd && bStart < aEnd) {
                    overlapping.add(a.id);
                    overlapping.add(b.id);
                }
            }
        }
        return overlapping;
    }

    const existingOverlaps = findOverlaps(items);
    const newEndValid = toMin(newEnd) > toMin(newStart);
    const newOverlapsExisting = newLabel.trim() && newEndValid && items.some((dp) => {
        const aStart = toMin(newStart), aEnd = toMin(newEnd);
        const bStart = toMin(dp.start_time), bEnd = toMin(dp.end_time);
        return aStart < bEnd && bStart < aEnd;
    });

    async function addDaypart() {
        setError(null);
        try {
            await api.createDaypart({
                label: newLabel.trim(),
                start_time: newStart,
                end_time: newEnd,
                sort_order: Number(newOrder),
            });
            setNewLabel("");
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    async function saveDaypart(dp: Daypart) {
        setError(null);
        try {
            await api.updateDaypart(dp.id, {
                label: dp.label, start_time: dp.start_time,
                end_time: dp.end_time, sort_order: dp.sort_order,
            });
            await load();
        } catch (e) {
            setError(String(e));
        }
    }

    async function deleteDaypart(id: number) {
        setError(null);
        try { await api.deleteDaypart(id); setDeleteTarget(null); await load(); }
        catch (e) { setError(String(e)); setDeleteTarget(null); }
    }

    return (
        <div>
            <PageHeader title="Dayparts" subtitle="Define the time slots for your operating day (e.g. Lunch, Dinner)." />

            {/* Add new daypart */}
            <Card className="p-5 mb-6">
                <h3 className="text-sm font-semibold text-mariana mb-3">Add Daypart</h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-grey mb-1">Label</label>
                        <input
                            type="text"
                            placeholder="e.g. Lunch"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">Start</label>
                        <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1">End</label>
                        <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                    </div>
                    <div>
                        <Button onClick={addDaypart} disabled={!newLabel.trim() || !newEndValid || !!newOverlapsExisting} size="md" className="w-full">
                            Add
                        </Button>
                    </div>
                </div>
                {!newEndValid && newStart && newEnd && (
                    <p className="text-xs text-red-500 mt-2">⚠ End time must be after start time.</p>
                )}
                {newOverlapsExisting && (
                    <p className="text-xs text-amber-600 mt-2">⚠ This time range overlaps an existing daypart.</p>
                )}
            </Card>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {/* Existing dayparts */}
            {loading ? (
                <p className="text-grey animate-pulse">Loading…</p>
            ) : items.length === 0 ? (
                <Card className="p-8 text-center text-grey">No dayparts yet. Add one above.</Card>
            ) : (
                <Card className="overflow-hidden">
                    <table>
                        <thead>
                            <tr>
                                <th className="!pl-5">Label</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Order</th>
                                <th className="text-right !pr-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((dp, idx) => (
                                <tr key={dp.id} className={existingOverlaps.has(dp.id) ? "bg-amber-50" : ""}>
                                    <td className="!pl-5">
                                        <input
                                            type="text"
                                            value={dp.label}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, label: v } : x)));
                                            }}
                                            className="!w-40"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            value={dp.start_time}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, start_time: v } : x)));
                                            }}
                                            className="!w-28"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            value={dp.end_time}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, end_time: v } : x)));
                                            }}
                                            className="!w-28"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={dp.sort_order}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: v } : x)));
                                            }}
                                            className="!w-20"
                                        />
                                    </td>
                                    <td className="!pr-5">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="secondary" size="sm" onClick={() => saveDaypart(dp)}>Save</Button>
                                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(dp.id)}>Delete</Button>
                                        </div>
                                        {existingOverlaps.has(dp.id) && (
                                            <div className="text-[10px] text-amber-600 mt-1">⚠ Overlaps another daypart</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete daypart?"
                message="This will permanently delete this daypart. Existing baseline data referencing it may be affected."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteTarget !== null) deleteDaypart(deleteTarget); }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}