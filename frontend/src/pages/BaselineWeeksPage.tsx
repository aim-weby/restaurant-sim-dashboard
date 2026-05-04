import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek } from "../api/types";
import { useToast } from "../components/Toast";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";

/* Pre-built Czech restaurant template (typical Prague bistro, 7 weekdays × 3 dayparts) */
const CZECH_TEMPLATE = {
    label: "Czech Restaurant — Typical Week",
    // daypart_id 1=Lunch, 2=Afternoon, 3=Dinner (standard seed layout)
    cells: [
        // Monday
        { weekday: 0, daypart_id: 1, arrivals_groups: 18, avg_spend_per_group: 420, avg_party_size: 2.2 },
        { weekday: 0, daypart_id: 2, arrivals_groups: 6, avg_spend_per_group: 280, avg_party_size: 1.8 },
        { weekday: 0, daypart_id: 3, arrivals_groups: 14, avg_spend_per_group: 520, avg_party_size: 2.5 },
        // Tuesday
        { weekday: 1, daypart_id: 1, arrivals_groups: 20, avg_spend_per_group: 420, avg_party_size: 2.2 },
        { weekday: 1, daypart_id: 2, arrivals_groups: 7, avg_spend_per_group: 290, avg_party_size: 1.9 },
        { weekday: 1, daypart_id: 3, arrivals_groups: 15, avg_spend_per_group: 530, avg_party_size: 2.4 },
        // Wednesday
        { weekday: 2, daypart_id: 1, arrivals_groups: 22, avg_spend_per_group: 430, avg_party_size: 2.3 },
        { weekday: 2, daypart_id: 2, arrivals_groups: 8, avg_spend_per_group: 300, avg_party_size: 2.0 },
        { weekday: 2, daypart_id: 3, arrivals_groups: 16, avg_spend_per_group: 540, avg_party_size: 2.5 },
        // Thursday
        { weekday: 3, daypart_id: 1, arrivals_groups: 22, avg_spend_per_group: 430, avg_party_size: 2.3 },
        { weekday: 3, daypart_id: 2, arrivals_groups: 9, avg_spend_per_group: 310, avg_party_size: 2.0 },
        { weekday: 3, daypart_id: 3, arrivals_groups: 18, avg_spend_per_group: 560, avg_party_size: 2.6 },
        // Friday
        { weekday: 4, daypart_id: 1, arrivals_groups: 24, avg_spend_per_group: 450, avg_party_size: 2.4 },
        { weekday: 4, daypart_id: 2, arrivals_groups: 10, avg_spend_per_group: 320, avg_party_size: 2.1 },
        { weekday: 4, daypart_id: 3, arrivals_groups: 25, avg_spend_per_group: 620, avg_party_size: 2.8 },
        // Saturday
        { weekday: 5, daypart_id: 1, arrivals_groups: 26, avg_spend_per_group: 480, avg_party_size: 2.6 },
        { weekday: 5, daypart_id: 2, arrivals_groups: 12, avg_spend_per_group: 350, avg_party_size: 2.2 },
        { weekday: 5, daypart_id: 3, arrivals_groups: 28, avg_spend_per_group: 650, avg_party_size: 3.0 },
        // Sunday
        { weekday: 6, daypart_id: 1, arrivals_groups: 20, avg_spend_per_group: 460, avg_party_size: 2.5 },
        { weekday: 6, daypart_id: 2, arrivals_groups: 8, avg_spend_per_group: 300, avg_party_size: 2.0 },
        { weekday: 6, daypart_id: 3, arrivals_groups: 12, avg_spend_per_group: 500, avg_party_size: 2.4 },
    ],
};

export default function BaselineWeeksPage() {
    const nav = useNavigate();
    const toast = useToast();
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cloning, setCloning] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<BaselineWeek | null>(null);
    const [factoryResetTarget, setFactoryResetTarget] = useState<boolean>(false);
    const [weekStart, setWeekStart] = useState("2026-02-03");
    const [label, setLabel] = useState("Test week");

    async function load() {
        setError(null);
        setLoading(true);
        try { setWeeks(await api.listWeeks()); }
        catch (e) { setError(String(e)); }
        finally { setLoading(false); }
    }

    async function create() {
        setError(null);
        try {
            const w = await api.createWeek({ week_start: weekStart, label });
            toast.success(`Week "${w.label}" created!`);
            await load();
            nav(`/baseline-weeks/${w.id}/dashboard`);
        } catch (e) { setError(String(e)); }
    }

    async function cloneWeek(sourceWeek: BaselineWeek) {
        setCloning(sourceWeek.id);
        try {
            // 1. Create a new week
            const newWeek = await api.createWeek({
                week_start: sourceWeek.week_start,
                label: `${sourceWeek.label} (copy)`,
            });
            // 2. Copy the grid data from source
            const data = await api.getBaselineData(sourceWeek.id);
            if (data.length > 0) {
                const cells = data.map((c) => ({
                    weekday: c.weekday,
                    daypart_id: c.daypart_id,
                    arrivals_groups: c.arrivals_groups,
                    avg_spend_per_group: c.avg_spend_per_group,
                    avg_party_size: c.avg_party_size,
                }));
                await api.putBaselineData(newWeek.id, cells);
            }
            toast.success(`Cloned "${sourceWeek.label}" → "${newWeek.label}"`);
            await load();
            nav(`/baseline-weeks/${newWeek.id}/dashboard`);
        } catch (e) {
            toast.error(`Clone failed: ${e}`);
        } finally {
            setCloning(null);
        }
    }

    async function createFromTemplate() {
        setError(null);
        try {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
            const weekStartStr = monday.toISOString().split("T")[0];

            const w = await api.createWeek({ week_start: weekStartStr, label: CZECH_TEMPLATE.label });
            await api.putBaselineData(w.id, CZECH_TEMPLATE.cells);
            toast.success("🇨🇿 Czech restaurant template created with realistic demand data!");
            await load();
            nav(`/baseline-weeks/${w.id}/dashboard`);
        } catch (e) {
            toast.error(`Template failed: ${e}`);
        }
    }

    async function seedDemo() {
        try {
            await api.seedDemo();
            toast.success("Demo data seeded!");
            await load();
        } catch (e) { setError(String(e)); }
    }

    async function seedPresentation() {
        try {
            await api.seedPresentation();
            toast.success("Factory reset complete. Seed presentation data loaded!");
            setFactoryResetTarget(false);
            await load();
        } catch (e) {
            setError(String(e));
            setFactoryResetTarget(false);
        }
    }

    async function handleDeleteWeek() {
        if (!deleteTarget) return;
        try {
            await api.deleteWeek(deleteTarget.id);
            toast.success(`Week "${deleteTarget.label}" deleted.`);
            setDeleteTarget(null);
            await load();
        } catch (e) { setError(String(e)); setDeleteTarget(null); }
    }

    useEffect(() => { load(); }, []);

    return (
        <div>
            <PageHeader title="Baseline Weeks" subtitle="Create a baseline week, fill the demand grid, then explore dashboard & simulations.">
                <Button variant="secondary" size="sm" onClick={createFromTemplate}>
                    🇨🇿 Czech Template
                </Button>
                <Button variant="secondary" size="sm" onClick={seedDemo}>
                    🌱 Seed Demo
                </Button>
                <Button variant="danger" size="sm" onClick={() => setFactoryResetTarget(true)}>
                    ⚠️ Factory Reset
                </Button>
            </PageHeader>

            {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

            {/* Create new week */}
            <Card className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-deep-blue to-indigo-600 flex items-center justify-center text-white text-sm shadow-lg shadow-deep-blue/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-mariana">Create New Week</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1.5">Week Start</label>
                        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-grey mb-1.5">Label</label>
                        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Week 5 — Valentine's" />
                    </div>
                    <Button onClick={create} className="sm:self-end">
                        Create Week
                    </Button>
                </div>
            </Card>

            {/* Existing weeks list */}
            <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-mariana">Existing Weeks</h3>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-deep-blue/10 text-deep-blue text-[10px] font-bold">{weeks.length}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                    {loading ? (
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                            Loading…
                        </span>
                    ) : "↻ Refresh"}
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-32 gap-3">
                    <div className="w-5 h-5 border-2 border-deep-blue/30 border-t-deep-blue rounded-full animate-spin" />
                    <span className="text-grey text-sm">Loading weeks…</span>
                </div>
            ) : weeks.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="text-3xl mb-3">📋</div>
                    <p className="text-grey text-sm mb-1">No weeks yet.</p>
                    <p className="text-grey text-xs">Create one above, use <strong>"Seed Demo"</strong>, or try the <strong>"🇨🇿 Czech Template"</strong>.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {weeks.map((w, i) => (
                        <Card key={w.id} className="p-5 group hover:scale-[1.005] transition-transform duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-deep-blue/10 to-indigo-100 flex items-center justify-center text-deep-blue font-bold text-sm">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-mariana">{w.label}</div>
                                        <div className="text-xs text-grey mt-0.5 flex items-center gap-2">
                                            <span>ID {w.id}</span>
                                            <span className="w-1 h-1 rounded-full bg-grey/40" />
                                            <span>Start: {w.week_start}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="primary" size="sm" onClick={() => nav(`/baseline-weeks/${w.id}/dashboard`)}>
                                        📊 Dashboard
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => nav(`/baseline-weeks/${w.id}/grid`)}>
                                        Grid
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => nav(`/baseline-weeks/${w.id}/kpis`)}>
                                        KPIs
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => nav(`/baseline-weeks/${w.id}/scenarios`)}>
                                        Scenarios
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => nav(`/baseline-weeks/${w.id}/sim-params`)}>
                                        ⚙️ Params
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cloneWeek(w)}
                                        disabled={cloning === w.id}
                                    >
                                        {cloning === w.id ? (
                                            <span className="flex items-center gap-1">
                                                <span className="w-3 h-3 border-2 border-grey/30 border-t-mariana rounded-full animate-spin" />
                                                Cloning…
                                            </span>
                                        ) : "📋 Clone"}
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(w)}>
                                        🗑️
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete baseline week?"
                message={`This will permanently delete "${deleteTarget?.label}" and all its associated data (grid, scenarios, sim params). This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleDeleteWeek}
                onCancel={() => setDeleteTarget(null)}
            />
            <ConfirmDialog
                open={factoryResetTarget}
                title="Factory Reset App?"
                message="This will WIPE ALL DATA in the application (baseline weeks, scenarios, settings, etc.) and reset it back to the original presentation seed state. This cannot be undone."
                confirmLabel="Factory Reset"
                variant="danger"
                onConfirm={seedPresentation}
                onCancel={() => setFactoryResetTarget(false)}
            />
        </div>
    );
}