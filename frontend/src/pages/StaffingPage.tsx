import { useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { Daypart, StaffingRow, OpeningHoursItem } from "../api/types";
import { WEEKDAYS } from "../utils/format";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";



function hhmmToHours(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return h + m / 60;
}

function daypartDuration(dp: Daypart): number {
    const start = hhmmToHours(dp.start_time);
    const end = hhmmToHours(dp.end_time);
    let dur = end - start;
    if (dur <= 0) dur += 24; // overnight
    return Math.round(dur * 4) / 4; // round to nearest 0.25
}

export default function StaffingPage() {
    const toast = useToast();
    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [rows, setRows] = useState<StaffingRow[]>([]);
    const [openingHours, setOpeningHours] = useState<OpeningHoursItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Bulk fill state
    const [bulkRateRole, setBulkRateRole] = useState<"kitchen" | "service">("kitchen");
    const [bulkRateValue, setBulkRateValue] = useState<number>(180);

    useEffect(() => {
        Promise.all([api.listDayparts(), api.listStaffing(), api.getOpeningHours()])
            .then(([dp, st, oh]) => { setDayparts(dp); setRows(st); setOpeningHours(oh); })
            .catch((e) => setError(String(e)));
    }, []);

    // Daypart duration lookup
    const dpDurationMap = useMemo(() => {
        const m: Record<number, number> = {};
        for (const dp of dayparts) m[dp.id] = daypartDuration(dp);
        return m;
    }, [dayparts]);

    // Closed days lookup
    const closedDays = useMemo(() => {
        const s = new Set<number>();
        for (const oh of openingHours) if (oh.is_closed) s.add(oh.weekday);
        return s;
    }, [openingHours]);

    // Daypart label lookup
    const dpLabelMap = useMemo(() => {
        const m: Record<number, string> = {};
        for (const dp of dayparts) m[dp.id] = dp.label;
        return m;
    }, [dayparts]);

    function addRow() {
        if (dayparts.length === 0) return;
        const dp = dayparts[0];
        setRows((prev) => [
            ...prev,
            { weekday: 0, daypart_id: dp.id, role: "kitchen", staff_count: 1, hourly_rate: bulkRateValue, hours_in_daypart: daypartDuration(dp) },
        ]);
    }

    function removeRow(idx: number) {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    }

    async function saveAll() {
        // Validate before saving
        const warnings: string[] = [];
        for (const r of rows) {
            const maxH = dpDurationMap[r.daypart_id] ?? 24;
            if (r.hours_in_daypart > maxH) {
                warnings.push(`${WEEKDAYS[r.weekday]} ${dpLabelMap[r.daypart_id] ?? ""} ${r.role}: ${r.hours_in_daypart}h exceeds daypart duration (${maxH}h)`);
            }
            if (r.staff_count < 1) {
                warnings.push(`${WEEKDAYS[r.weekday]} ${dpLabelMap[r.daypart_id] ?? ""} ${r.role}: staff count must be ≥ 1`);
            }
            if (r.hours_in_daypart < 1) {
                warnings.push(`${WEEKDAYS[r.weekday]} ${dpLabelMap[r.daypart_id] ?? ""} ${r.role}: hours must be ≥ 1`);
            }
        }
        if (warnings.length > 0) {
            setError(`Validation errors:\n• ${warnings.join("\n• ")}`);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = rows.map((r) => ({
                weekday: r.weekday, daypart_id: r.daypart_id, role: r.role,
                staff_count: Number(r.staff_count), hourly_rate: Number(r.hourly_rate),
                hours_in_daypart: Number(r.hours_in_daypart),
            }));
            setRows(await api.upsertStaffing(payload));
            toast.success("Staffing plan saved!");
        } catch (e) {
            setError(String(e));
        } finally {
            setSaving(false);
        }
    }

    function updateRow(idx: number, field: string, value: string | number) {
        setRows((prev) => prev.map((x, i) => {
            if (i !== idx) return x;
            const updated = { ...x, [field]: value };
            // Auto-clamp hours when daypart changes
            if (field === "daypart_id") {
                const maxH = dpDurationMap[Number(value)] ?? 24;
                if (updated.hours_in_daypart > maxH) updated.hours_in_daypart = maxH;
            }
            // Clamp hours to daypart max
            if (field === "hours_in_daypart") {
                const maxH = dpDurationMap[updated.daypart_id] ?? 24;
                updated.hours_in_daypart = Math.min(Number(value), maxH);
            }
            return updated;
        }));
    }

    // Fill all hours to full daypart duration
    function fillAllHours() {
        setRows((prev) => prev.map((r) => ({
            ...r,
            hours_in_daypart: dpDurationMap[r.daypart_id] ?? r.hours_in_daypart,
        })));
        toast.info("All hours set to full daypart duration.");
    }

    // Apply bulk rate to all rows of a specific role
    function applyBulkRate() {
        let count = 0;
        setRows((prev) => prev.map((r) => {
            if (r.role === bulkRateRole) { count++; return { ...r, hourly_rate: bulkRateValue }; }
            return r;
        }));
        toast.info(`Rate ${bulkRateValue} CZK/h applied to ${count} ${bulkRateRole} entries.`);
    }

    // Coverage check: which (weekday × daypart × role) are missing?
    const coverageWarnings = useMemo(() => {
        const warnings: string[] = [];
        const existing = new Set(rows.map((r) => `${r.weekday}-${r.daypart_id}-${r.role}`));
        for (let wd = 0; wd < 7; wd++) {
            if (closedDays.has(wd)) continue;
            for (const dp of dayparts) {
                for (const role of ["kitchen", "service"]) {
                    if (!existing.has(`${wd}-${dp.id}-${role}`)) {
                        warnings.push(`${WEEKDAYS[wd]} ${dp.label} — missing ${role}`);
                    }
                }
            }
        }
        return warnings;
    }, [rows, dayparts, closedDays]);

    // Total labor cost
    const totalLabor = useMemo(() =>
        rows.reduce((sum, r) => sum + r.staff_count * r.hourly_rate * r.hours_in_daypart, 0)
    , [rows]);

    return (
        <div>
            <PageHeader title="Staffing Plan" subtitle="Define staff counts and wages per weekday, daypart, and role.">
                <div className="flex gap-2 items-center flex-wrap">
                    <Button variant="secondary" onClick={addRow} disabled={dayparts.length === 0} size="sm">
                        + Add Row
                    </Button>
                    <Button onClick={saveAll} disabled={saving} size="sm">
                        {saving ? "Saving…" : "💾 Save All"}
                    </Button>
                </div>
            </PageHeader>

            {error && <pre className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100 whitespace-pre-wrap">{error}</pre>}

            {/* Quick Actions */}
            <Card className="p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs shadow-lg">⚡</div>
                    <h3 className="text-sm font-bold text-mariana">Quick Actions</h3>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Fill all hours */}
                    <div>
                        <Button variant="ghost" size="sm" onClick={fillAllHours} disabled={rows.length === 0}>
                            📐 Fill all hours to full daypart
                        </Button>
                    </div>

                    {/* Bulk hourly rate */}
                    <div className="flex items-end gap-2 border-l border-mist-dark/20 pl-4">
                        <div>
                            <label className="block text-[10px] text-grey mb-0.5">Role</label>
                            <select value={bulkRateRole} onChange={(e) => setBulkRateRole(e.target.value as "kitchen" | "service")} className="!w-24 text-xs">
                                <option value="kitchen">Kitchen</option>
                                <option value="service">Service</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-grey mb-0.5">Rate (CZK/h)</label>
                            <input type="number" value={bulkRateValue} onChange={(e) => setBulkRateValue(Number(e.target.value))} className="!w-20 text-xs" min={0} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={applyBulkRate} disabled={rows.length === 0}>
                            Apply to all {bulkRateRole}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Coverage warnings */}
            {coverageWarnings.length > 0 && rows.length > 0 && (
                <Card className="p-4 mb-5 border-l-4 border-amber-400 bg-amber-50/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">⚠️</span>
                        <span className="text-xs font-bold text-amber-800">Missing coverage ({coverageWarnings.length} gaps)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                        {coverageWarnings.slice(0, 12).map((w) => (
                            <span key={w} className="text-[10px] text-amber-700">{w}</span>
                        ))}
                        {coverageWarnings.length > 12 && (
                            <span className="text-[10px] text-amber-600 font-medium">+{coverageWarnings.length - 12} more…</span>
                        )}
                    </div>
                </Card>
            )}

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
                                <th>Staff Count</th>
                                <th>Hourly Rate (CZK/h)</th>
                                <th>Hours</th>
                                <th className="text-right">Cost</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, idx) => {
                                const maxH = dpDurationMap[r.daypart_id] ?? 24;
                                const isOverHours = r.hours_in_daypart > maxH;
                                const isFull = r.hours_in_daypart === maxH;
                                const rowCost = r.staff_count * r.hourly_rate * r.hours_in_daypart;
                                const isClosed = closedDays.has(r.weekday);
                                return (
                                    <tr key={r.id ?? `${r.weekday}-${r.daypart_id}-${r.role}`} className={isClosed ? "opacity-40" : ""}>
                                        <td>
                                            <select value={r.weekday} onChange={(e) => updateRow(idx, "weekday", Number(e.target.value))}>
                                                {WEEKDAYS.map((w, i) => (
                                                    <option key={w} value={i}>{w}{closedDays.has(i) ? " 🚫" : ""}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <select value={r.daypart_id} onChange={(e) => updateRow(idx, "daypart_id", Number(e.target.value))}>
                                                    {dayparts.map((d) => (
                                                        <option key={d.id} value={d.id}>{d.label} ({daypartDuration(d)}h)</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <select value={r.role} onChange={(e) => updateRow(idx, "role", e.target.value)}>
                                                <option value="kitchen">🍳 Kitchen</option>
                                                <option value="service">🍽️ Service</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number" className="!w-16" min={1}
                                                value={r.staff_count}
                                                onChange={(e) => updateRow(idx, "staff_count", Math.max(1, Number(e.target.value)))}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number" className="!w-24" min={0} step={10}
                                                value={r.hourly_rate}
                                                onChange={(e) => updateRow(idx, "hourly_rate", Number(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number" step={0.25} min={1} max={maxH}
                                                    className={`!w-16 ${isOverHours ? "!border-red-400 !bg-red-50" : ""}`}
                                                    value={r.hours_in_daypart}
                                                    onChange={(e) => updateRow(idx, "hours_in_daypart", Number(e.target.value))}
                                                />
                                                {!isFull && (
                                                    <button
                                                        onClick={() => updateRow(idx, "hours_in_daypart", maxH)}
                                                        className="text-[10px] text-deep-blue hover:text-deep-blue/80 whitespace-nowrap font-medium"
                                                        title={`Fill to full daypart (${maxH}h)`}
                                                    >
                                                        max
                                                    </button>
                                                )}
                                                {isFull && <span className="text-[10px] text-algae-dark">✓</span>}
                                                {isOverHours && <span className="text-[10px] text-red-500" title={`Max: ${maxH}h`}>⚠️</span>}
                                            </div>
                                        </td>
                                        <td className="text-right text-xs font-mono text-grey">
                                            {rowCost.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => removeRow(idx)}
                                                className="text-grey hover:text-red-500 transition-colors text-xs p-1"
                                                title="Remove row"
                                                aria-label="Remove row"
                                            >✕</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-mist-dark/30">
                                <td colSpan={6} className="text-right text-xs font-bold text-mariana">
                                    Total weekly labor cost:
                                </td>
                                <td className="text-right text-sm font-bold text-mariana font-mono">
                                    {totalLabor.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} CZK
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            )}

            <p className="mt-3 text-xs text-grey">
                💡 Hourly rate is <strong>per person</strong>. Cost = staff_count × rate × hours. Rows are stored per weekday × daypart × role — duplicates are merged on save.
            </p>
        </div>
    );
}