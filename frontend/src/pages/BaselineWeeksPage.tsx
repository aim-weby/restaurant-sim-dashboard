import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type { BaselineWeek } from "../api/types";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function BaselineWeeksPage() {
    const nav = useNavigate();
    const [weeks, setWeeks] = useState<BaselineWeek[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
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
            await load();
            nav(`/baseline-weeks/${w.id}/dashboard`);
        } catch (e) { setError(String(e)); }
    }

    async function seedDemo() {
        try {
            await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/seed/demo`, { method: "POST" });
            await load();
        } catch (e) { setError(String(e)); }
    }

    useEffect(() => { load(); }, []);

    return (
        <div>
            <PageHeader title="Baseline Weeks" subtitle="Create a baseline week, fill the demand grid, then explore dashboard & simulations.">
                <Button variant="secondary" size="sm" onClick={seedDemo}>
                    🌱 Seed Demo
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
                    <p className="text-grey text-xs">Create one above or use <strong>"Seed Demo"</strong> to load sample data.</p>
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
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}