import { fmtCurrency } from "../utils/format";

/**
 * Shared Recharts custom tooltip with modern glassmorphism look.
 * Used across DashboardPage, ReportPage, and any future chart pages.
 */
export default function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-mariana/95 backdrop-blur-md text-white text-xs rounded-xl px-4 py-3 shadow-xl border border-white/10">
            <div className="font-semibold mb-1.5">{label}</div>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-4 items-center">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        {p.name ?? p.dataKey}
                    </span>
                    <span className="font-mono font-bold">{typeof p.value === "number" && p.value > 100 ? fmtCurrency(p.value) : p.value}</span>
                </div>
            ))}
        </div>
    );
}
