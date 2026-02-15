import { useState } from "react";
import { api } from "../api/endpoints";
import type { AiInsight } from "../api/types";

const severityColors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    opportunity: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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
                    {insights.map((ins, i) => (
                        <div
                            key={i}
                            className={`rounded-xl border p-4 ${severityColors[ins.severity] || severityColors.info}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span>{categoryIcons[ins.category] || "💡"}</span>
                                <span className="font-semibold text-sm">{ins.title}</span>
                                <span className="ml-auto text-xs opacity-60 uppercase tracking-wider">
                                    {ins.category}
                                </span>
                            </div>
                            <p className="text-sm opacity-80 mb-2">{ins.text}</p>
                            <p className="text-sm font-medium">
                                💡 {ins.recommendation}
                            </p>
                        </div>
                    ))}
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
