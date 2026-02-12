import PageHeader from "../components/PageHeader";
import Card from "../components/Card";

const KPI_TABLE = [
    { id: "KPI-F1", name: "Revenue", formula: "Σ (arrivals × avg_spend)", unit: "CZK", icon: "💰" },
    { id: "KPI-F2", name: "COGS", formula: "Revenue × food_cost_pct", unit: "CZK", icon: "📦" },
    { id: "KPI-F3", name: "Labor Cost", formula: "Σ (staff × rate × hours)", unit: "CZK", icon: "👷" },
    { id: "KPI-F4", name: "Prime Cost", formula: "COGS + Labor Cost", unit: "CZK", icon: "⚙️" },
    { id: "KPI-F5", name: "Profit", formula: "Revenue − Prime Cost − Fixed Cost", unit: "CZK", icon: "📈" },
    { id: "KPI-F6", name: "Profit Margin", formula: "Profit / Revenue", unit: "%", icon: "📊" },
    { id: "KPI-O1", name: "Avg Wait (Food)", formula: "Mean of kitchen prep times (DES)", unit: "min", icon: "⏱️" },
    { id: "KPI-O2", name: "P90 Wait (Food)", formula: "90th percentile prep time (DES)", unit: "min", icon: "⏳" },
    { id: "KPI-O3", name: "Kitchen Utilization", formula: "Kitchen busy / total time (DES)", unit: "%", icon: "👨‍🍳" },
    { id: "KPI-O4", name: "Lost Groups", formula: "Groups that balked (DES)", unit: "count", icon: "❌" },
];

export default function AboutPage() {
    return (
        <div className="max-w-3xl">
            <PageHeader title="About the Model" subtitle="Methodology, KPI definitions, and model limitations." />

            {/* Simulation Model */}
            <Card className="p-6 mb-5" accent="blue">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-deep-blue to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-deep-blue/20">🔬</div>
                    <h2 className="text-base font-bold text-mariana">Simulation Model</h2>
                </div>
                <p className="text-sm leading-relaxed text-mariana/80 mb-3">
                    This application uses a <strong>Discrete-Event Simulation (DES)</strong> model built with
                    SimPy to simulate restaurant operations over a one-week period.
                </p>
                <p className="text-sm leading-relaxed text-mariana/80 mb-4">
                    The model treats the restaurant as a <strong>queueing system</strong> with three main resources:
                    tables (fixed capacity), kitchen staff, and service staff. Customer groups arrive according to
                    the demand data entered per weekday and daypart, with optional stochastic noise.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-deep-blue/10 rounded-xl p-4 bg-deep-blue/[0.02]">
                        <h3 className="text-sm font-semibold text-mariana mb-2 flex items-center gap-2">
                            <span>🔄</span> Process Flow
                        </h3>
                        <ol className="text-sm leading-loose text-mariana/80 pl-5 list-decimal">
                            <li>Group arrives → waits for a table (may balk)</li>
                            <li>Seated → places order → waits for kitchen</li>
                            <li>Kitchen prepares food (triangular dist.)</li>
                            <li>Group dines (seat time, triangular dist.)</li>
                            <li>Group pays and leaves → table freed</li>
                        </ol>
                    </div>

                    <div className="border border-deep-blue/10 rounded-xl p-4 bg-deep-blue/[0.02]">
                        <h3 className="text-sm font-semibold text-mariana mb-2 flex items-center gap-2">
                            <span>🎛️</span> Key Parameters
                        </h3>
                        <ul className="text-sm leading-loose text-mariana/80 pl-5 list-disc">
                            <li><strong>Prep time</strong>: Triangular(min, mode, max)</li>
                            <li><strong>Seat time</strong>: Triangular(min, mode, max)</li>
                            <li><strong>Alpha</strong>: Seat↔wait correlation</li>
                            <li><strong>Elasticity</strong>: Demand per price Δ</li>
                            <li><strong>Noise</strong>: Random ±% on arrivals</li>
                            <li><strong>Balking</strong>: Max wait limits</li>
                        </ul>
                    </div>
                </div>
            </Card>

            {/* KPI Definitions */}
            <Card className="mb-5 overflow-hidden">
                <div className="p-5 pb-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-sm shadow-lg">📊</div>
                    <h2 className="text-base font-bold text-mariana">KPI Definitions</h2>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {KPI_TABLE.map((k) => (
                            <div key={k.id} className="border border-mist-dark/15 rounded-xl p-3 hover:bg-mist/20 transition-colors duration-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">{k.icon}</span>
                                    <span className="text-xs font-bold text-mariana">{k.name}</span>
                                    <span className="ml-auto text-[10px] font-mono text-grey bg-mist/40 px-1.5 py-0.5 rounded">{k.id}</span>
                                </div>
                                <div className="text-xs text-grey font-mono">{k.formula}</div>
                                <div className="text-[10px] text-grey mt-0.5">Unit: {k.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Data Health */}
            <Card className="p-6 mb-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm shadow-lg">🩺</div>
                    <h2 className="text-base font-bold text-mariana">Data Health Scoring</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-mist-dark/15 rounded-xl p-4 bg-mist/10">
                        <div className="flex items-center gap-2 mb-1">
                            <span>📊</span>
                            <span className="text-sm font-semibold text-mariana">Coverage Score</span>
                        </div>
                        <p className="text-xs text-mariana/70">% of weekday×daypart cells with complete data (arrivals, spend, party size, staffing)</p>
                    </div>
                    <div className="border border-mist-dark/15 rounded-xl p-4 bg-mist/10">
                        <div className="flex items-center gap-2 mb-1">
                            <span>🎯</span>
                            <span className="text-sm font-semibold text-mariana">Actionability Score</span>
                        </div>
                        <p className="text-xs text-mariana/70">Whether dataset supports meaningful simulations (sufficient dayparts, non-zero demand, staffing defined)</p>
                    </div>
                </div>
            </Card>

            {/* Scenario System */}
            <Card className="p-6 mb-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm shadow-lg">🧪</div>
                    <h2 className="text-base font-bold text-mariana">Scenario System</h2>
                </div>
                <p className="text-sm leading-relaxed text-mariana/80 mb-3">
                    Scenarios allow what-if analysis by modifying baseline parameters:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {[
                        { icon: "👷", label: "Staffing", desc: "Add/remove kitchen or service staff per daypart" },
                        { icon: "💲", label: "Pricing", desc: "% or absolute price adjustments (demand reacts via elasticity)" },
                        { icon: "🪑", label: "Capacity", desc: "Modify table/seat counts" },
                    ].map((item) => (
                        <div key={item.label} className="border border-mist-dark/15 rounded-xl p-3 bg-mist/10 hover:bg-mist/20 transition-colors duration-200">
                            <div className="flex items-center gap-2 mb-1">
                                <span>{item.icon}</span>
                                <span className="text-sm font-semibold text-mariana">{item.label}</span>
                            </div>
                            <p className="text-xs text-mariana/70">{item.desc}</p>
                        </div>
                    ))}
                </div>
                <p className="text-sm leading-relaxed text-mariana/80">
                    Each scenario runs N simulations (default 200) with a fixed seed for reproducibility.
                    Results are reported as mean, p10, p50, and p90 across all runs.
                </p>
            </Card>

            {/* Limitations */}
            <Card className="p-6 mb-5" accent="orange">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-sm shadow-lg">⚠️</div>
                    <h2 className="text-base font-bold text-mariana">Limitations</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                        "Single-week model — no seasonality or long-term trends",
                        "Simplified demand: groups arrive uniformly within each daypart",
                        "No delivery/takeaway modeling (dine-in only)",
                        "Linear price elasticity (constant across price range)",
                        "Kitchen modeled as single queue (no course-level detail)",
                        "Staff are homogeneous within role (no skill differentiation)",
                    ].map((text) => (
                        <div key={text} className="flex items-start gap-2 text-sm text-mariana/80 bg-amber-50/50 rounded-lg p-2.5">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{text}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <p className="text-xs text-grey mt-6 flex items-center gap-2">
                <span>🎓</span>
                Built as part of a bachelor thesis at VŠE Prague, 2025. SimPy-based DES engine with React frontend.
            </p>
        </div>
    );
}
