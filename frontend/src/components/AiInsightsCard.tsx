import { useState } from "react";
import { api } from "../api/endpoints";
import type { AiInsight } from "../api/types";

const severityConfig: Record<string, { border: string; badge: string; badgeText: string; icon: string }> = {
    critical:    { border: "border-l-red-500",     badge: "bg-red-50 text-red-700 border border-red-200",       badgeText: "Critical",    icon: "🔴" },
    warning:     { border: "border-l-amber-500",   badge: "bg-amber-50 text-amber-700 border border-amber-200", badgeText: "Warning",     icon: "🟡" },
    opportunity: { border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", badgeText: "Opportunity", icon: "🟢" },
    info:        { border: "border-l-blue-500",    badge: "bg-blue-50 text-blue-700 border border-blue-200",    badgeText: "Info",        icon: "🔵" },
};

const categoryIcons: Record<string, string> = {
    revenue: "💰",
    costs: "📊",
    operations: "⚙️",
    demand: "📈",
    staffing: "👥",
};

export default function AiInsightsCard({ weekId }: { weekId: number }) {
    const [insights, setInsights] = useState<AiInsight[]>([]);
    const [loading, setLoading] = useState(false);
    const [tokensUsed, setTokensUsed] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [fetched, setFetched] = useState(false);

    const analyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getAiInsights(weekId);
            setInsights(res.insights);
            setTokensUsed(res.tokens_used);
            setFetched(true);
        } catch (e: any) {
            // Try to extract the detail from FastAPI's JSON error
            let msg = e?.message || "Failed to get AI insights";
            try {
                const jsonMatch = msg.match(/\{.*"detail"\s*:\s*"([^"]+)"/);
                if (jsonMatch) msg = jsonMatch[1];
            } catch { /* keep original */ }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    AI Analysis
                </h3>
                <button
                    onClick={analyze}
                    disabled={loading}
                    aria-label={fetched ? "Refresh AI analysis" : "Analyze with AI"}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium
                        bg-gradient-to-r from-violet-600 to-purple-600
                        hover:from-violet-500 hover:to-purple-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 text-white shadow-lg shadow-violet-500/20"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Analyzing…
                        </span>
                    ) : fetched ? "Refresh" : "Analyze with AI"}
                </button>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse rounded-xl bg-white/5 p-4">
                            <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                            <div className="h-3 bg-white/10 rounded w-full mb-1" />
                            <div className="h-3 bg-white/10 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Not yet analyzed */}
            {!loading && !fetched && !error && (
                <p className="text-sm text-gray-400 text-center py-6">
                    Click <strong>"Analyze with AI"</strong> to get GPT-powered insights for this week's data.
                </p>
            )}

            {/* Insights */}
            {!loading && fetched && insights.length > 0 && (
                <div className="space-y-3">
                    {insights.map((ins, i) => {
                        const cfg = severityConfig[ins.severity] ?? severityConfig.info;
                        return (
                            <div
                                key={i}
                                className={`rounded-xl bg-white border-l-4 ${cfg.border} border border-gray-100 p-4 shadow-sm`}
                            >
                                {/* Title row */}
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-lg leading-none mt-0.5">{categoryIcons[ins.category] || "💡"}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-gray-900">{ins.title}</span>
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                                {cfg.icon} {cfg.badgeText}
                                            </span>
                                            <span className="ml-auto text-xs text-gray-400 uppercase tracking-wider">
                                                {ins.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {/* Body */}
                                <p className="text-sm text-gray-600 mb-2 leading-relaxed">{ins.text}</p>
                                {/* Recommendation */}
                                <div className="flex items-start gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                                    <span className="text-sm">💡</span>
                                    <p className="text-sm font-medium text-gray-800">{ins.recommendation}</p>
                                </div>
                            </div>
                        );
                    })}
                    {tokensUsed > 0 && (
                        <p className="text-xs text-gray-500 text-right">
                            Tokens used: {tokensUsed} · Model: gpt-4o-mini
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
