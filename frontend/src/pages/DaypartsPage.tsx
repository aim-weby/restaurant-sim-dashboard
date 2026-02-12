import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Daypart } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function DaypartsPage() {
    const [items, setItems] = useState<Daypart[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [newLabel, setNewLabel] = useState("");
    const [newStart, setNewStart] = useState("11:00");
    const [newEnd, setNewEnd] = useState("14:00");
    const [newOrder, setNewOrder] = useState(0);

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
        if (!confirm("Delete this daypart?")) return;
        setError(null);
        try { await api.deleteDaypart(id); await load(); }
        catch (e) { setError(String(e)); }
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
                        <Button onClick={addDaypart} disabled={!newLabel.trim()} size="md" className="w-full">
                            Add
                        </Button>
                    </div>
                </div>
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
                                <tr key={dp.id}>
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
                                            <Button variant="danger" size="sm" onClick={() => deleteDaypart(dp.id)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}