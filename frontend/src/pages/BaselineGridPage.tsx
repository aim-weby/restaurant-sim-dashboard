import { useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineCell, Daypart } from "../api/types";
import { WEEKDAYS } from "../utils/format";
import { useToast } from "../components/Toast";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { Shortcut } from "../hooks/useKeyboardShortcuts";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { useState } from "react";



function keyOf(weekday: number, daypartId: number) {
    return `${weekday}:${daypartId}`;
}

export default function BaselineGridPage() {
    const { weekId } = useParams();
    const week = Number(weekId);
    const nav = useNavigate();
    const toast = useToast();

    const [dayparts, setDayparts] = useState<Daypart[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const { state: cells, push: pushCells, replace: replaceCells, undo, redo, reset: resetCells, canUndo, canRedo, historyLength } = useUndoRedo<Record<string, BaselineCell>>({});

    useEffect(() => {
        if (!Number.isFinite(week)) return;
        Promise.all([api.listDayparts(), api.getBaselineData(week)])
            .then(([dp, data]) => {
                setDayparts(dp);
                const map: Record<string, BaselineCell> = {};
                for (const c of data) map[keyOf(c.weekday, c.daypart_id)] = c;
                resetCells(map);
            })
            .catch((e) => setError(String(e)));
    }, [week, resetCells]);

    const grid = useMemo(() => {
        return WEEKDAYS.map((_, wd) =>
            dayparts.map((d) => {
                const k = keyOf(wd, d.id);
                return {
                    weekday: wd,
                    daypartId: d.id,
                    value: cells[k] ?? { weekday: wd, daypart_id: d.id, arrivals_groups: 0, avg_spend_per_group: 0, avg_party_size: 0 },
                };
            })
        );
    }, [cells, dayparts]);

    const updateCell = useCallback((weekday: number, daypartId: number, patch: Partial<BaselineCell>) => {
        const k = keyOf(weekday, daypartId);
        const newCells = {
            ...cells,
            [k]: { ...(cells[k] ?? { weekday, daypart_id: daypartId, arrivals_groups: 0, avg_spend_per_group: 0, avg_party_size: 0 }), ...patch },
        };
        replaceCells(newCells); // live update without undo snapshot
    }, [cells, replaceCells]);

    const cellsRef = useRef(cells);
    cellsRef.current = cells;
    const snapshotCell = useCallback(() => {
        pushCells(cellsRef.current); // creates an undo entry on focus (before editing)
    }, [pushCells]);

    async function saveAll() {
        setSaving(true);
        setError(null);
        try {
            const list = Object.values(cells).map((c) => ({
                weekday: c.weekday, daypart_id: c.daypart_id,
                arrivals_groups: Number(c.arrivals_groups),
                avg_spend_per_group: Number(c.avg_spend_per_group),
                avg_party_size: Number(c.avg_party_size),
            }));
            await api.putBaselineData(week, list);
            toast.success("Grid saved successfully!");
            nav(`/baseline-weeks/${week}/kpis`);
        } catch (e) {
            setError(String(e));
            toast.error("Save failed — check the error above.");
        } finally {
            setSaving(false);
        }
    }

    // Keyboard shortcuts for undo/redo/save
    const shortcuts: Shortcut[] = [
        { key: "z", ctrl: true, label: "Undo", action: undo },
        { key: "z", ctrl: true, shift: true, label: "Redo", action: redo },
        { key: "s", ctrl: true, label: "Save grid", action: () => { saveAll(); } },
    ];
    useKeyboardShortcuts(shortcuts);

    // U5: Warn about unsaved changes on page leave
    useEffect(() => {
        if (!canUndo) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [canUndo]);

    if (!Number.isFinite(week)) return <div className="p-6 text-red-600">Invalid weekId.</div>;

    return (
        <div>
            <PageHeader title={`Baseline Grid — Week #${week}`} subtitle="Set arrivals, average spend, and party size for each weekday × daypart.">
                <Link to={`/baseline-weeks/${week}/dashboard`} className="text-sm text-deep-blue hover:underline">← Dashboard</Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo"
                        className={`p-1.5 rounded-lg transition-all ${canUndo ? "text-deep-blue hover:bg-deep-blue/10" : "text-grey/40 cursor-not-allowed"}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Shift+Z)"
                        aria-label="Redo"
                        className={`p-1.5 rounded-lg transition-all ${canRedo ? "text-deep-blue hover:bg-deep-blue/10" : "text-grey/40 cursor-not-allowed"}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                        </svg>
                    </button>
                    {historyLength > 0 && (
                        <span className="text-[10px] text-grey">{historyLength} change{historyLength !== 1 ? "s" : ""}</span>
                    )}
                </div>
                <Button onClick={saveAll} disabled={saving} size="sm">
                    {saving ? (
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving…
                        </span>
                    ) : "💾 Save & View KPIs →"}
                </Button>
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {dayparts.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="text-3xl mb-3">📋</div>
                    <p className="text-grey text-sm">Create dayparts first.</p>
                </Card>
            ) : (
                <Card className="overflow-x-auto">
                    <table className="min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="!pl-5 w-20">Day</th>
                                {dayparts.map((d) => (
                                    <th key={d.id} className="text-center">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-deep-blue to-indigo-600" />
                                            {d.label}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grid.map((row, wd) => (
                                <tr key={wd} className="group hover:bg-deep-blue/[0.02] transition-colors duration-200">
                                    <td className="!pl-5 font-bold text-mariana align-top">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-deep-blue/10 to-indigo-100 flex items-center justify-center text-[10px] font-bold text-deep-blue">{WEEKDAYS[wd].charAt(0)}</span>
                                            {WEEKDAYS[wd]}
                                        </span>
                                    </td>
                                    {row.map((cell) => (
                                        <td key={`${cell.weekday}-${cell.daypartId}`} className="align-top">
                                            <div className="space-y-2 py-1">
                                                <div>
                                                    <label className="text-[10px] text-grey block">🚗 Arrivals</label>
                                                    <input
                                                        type="number"
                                                        className="!text-xs !py-1"
                                                        value={cell.value.arrivals_groups}
                                                        onFocus={snapshotCell}
                                                        onChange={(e) => updateCell(cell.weekday, cell.daypartId, { arrivals_groups: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-grey block">💰 Avg Spend</label>
                                                    <input
                                                        type="number"
                                                        className="!text-xs !py-1"
                                                        value={cell.value.avg_spend_per_group}
                                                        onFocus={snapshotCell}
                                                        onChange={(e) => updateCell(cell.weekday, cell.daypartId, { avg_spend_per_group: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-grey block">👥 Party Size</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="!text-xs !py-1"
                                                        value={cell.value.avg_party_size}
                                                        onFocus={snapshotCell}
                                                        onChange={(e) => updateCell(cell.weekday, cell.daypartId, { avg_party_size: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}