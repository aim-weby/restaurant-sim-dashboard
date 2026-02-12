import { sectionStyle } from "../utils/styles";

const KPI_TABLE = [
    { id: "KPI-F1", name: "Revenue", formula: "Σ (arrivals × avg_spend)", unit: "CZK" },
    { id: "KPI-F2", name: "COGS", formula: "Revenue × food_cost_pct", unit: "CZK" },
    { id: "KPI-F3", name: "Labor Cost", formula: "Σ (staff × rate × hours)", unit: "CZK" },
    { id: "KPI-F4", name: "Prime Cost", formula: "COGS + Labor Cost", unit: "CZK" },
    { id: "KPI-F5", name: "Profit", formula: "Revenue − Prime Cost − Fixed Cost", unit: "CZK" },
    { id: "KPI-F6", name: "Profit Margin", formula: "Profit / Revenue", unit: "%" },
    { id: "KPI-O1", name: "Avg Wait (Food)", formula: "Mean of kitchen prep times (DES)", unit: "min" },
    { id: "KPI-O2", name: "P90 Wait (Food)", formula: "90th percentile prep time (DES)", unit: "min" },
    { id: "KPI-O3", name: "Kitchen Utilization", formula: "Kitchen busy / total time (DES)", unit: "%" },
    { id: "KPI-O4", name: "Lost Groups", formula: "Groups that balked (DES)", unit: "count" },
];

export default function AboutPage() {
    return (
        <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>About the Model</h1>
            <p style={{ color: "#666", fontSize: 13, margin: "6px 0 20px" }}>
                Methodology, KPI definitions, and model limitations for the Restaurant Simulation Dashboard.
            </p>

            {/* Model Description */}
            <div style={sectionStyle()}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 10px" }}>Simulation Model</h2>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    This application uses a <strong>Discrete-Event Simulation (DES)</strong> model built with
                    SimPy to simulate restaurant operations over a one-week period.
                </p>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    The model treats the restaurant as a <strong>queueing system</strong> with three main resources:
                    tables (fixed capacity), kitchen staff, and service staff. Customer groups arrive according to
                    the demand data entered per weekday and daypart, with optional stochastic noise.
                </p>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "14px 0 6px" }}>Process Flow</h3>
                <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                    <li>Group arrives → waits for a table (may balk if wait exceeds limit)</li>
                    <li>Seated → places order → waits for kitchen (queue)</li>
                    <li>Kitchen prepares food (triangular distribution: min/mode/max)</li>
                    <li>Group dines (seat time, triangular distribution)</li>
                    <li>Group pays and leaves → table freed</li>
                </ol>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "14px 0 6px" }}>Key Parameters</h3>
                <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                    <li><strong>Prep time</strong>: Triangular(min, mode, max) — how long kitchen takes per order</li>
                    <li><strong>Seat time</strong>: Triangular(min, mode, max) — how long groups occupy a table</li>
                    <li><strong>Alpha (seat↔wait)</strong>: Correlation factor — longer kitchen wait → shorter dine time</li>
                    <li><strong>Price elasticity</strong>: Demand change per price change (default -1.2)</li>
                    <li><strong>Demand noise</strong>: Random ±% on arrivals per run for stochastic variation</li>
                    <li><strong>Balking limits</strong>: Max wait for table and food before group leaves</li>
                </ul>
            </div>

            {/* KPI Definitions */}
            <div style={{ ...sectionStyle(), marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 10px" }}>KPI Definitions</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee" }}>ID</th>
                            <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee" }}>Name</th>
                            <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #eee" }}>Formula</th>
                            <th style={{ textAlign: "center", padding: "6px 10px", borderBottom: "2px solid #eee" }}>Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {KPI_TABLE.map(k => (
                            <tr key={k.id}>
                                <td style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", fontWeight: 600, fontFamily: "monospace" }}>{k.id}</td>
                                <td style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0" }}>{k.name}</td>
                                <td style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", fontFamily: "monospace", fontSize: 11 }}>{k.formula}</td>
                                <td style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>{k.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Data Health */}
            <div style={{ ...sectionStyle(), marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 10px" }}>Data Health Scoring</h2>
                <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                    <li><strong>Coverage Score</strong>: % of weekday×daypart cells with complete data (arrivals, spend, party size, staffing)</li>
                    <li><strong>Actionability Score</strong>: Whether the dataset supports meaningful simulations (sufficient dayparts, non-zero demand, staffing defined)</li>
                </ul>
            </div>

            {/* Scenario System */}
            <div style={{ ...sectionStyle(), marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 10px" }}>Scenario System</h2>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Scenarios allow what-if analysis by modifying baseline parameters:
                </p>
                <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                    <li><strong>Staffing changes</strong>: Add/remove kitchen or service staff per daypart</li>
                    <li><strong>Price changes</strong>: % or absolute price adjustments (demand reacts via elasticity)</li>
                    <li><strong>Capacity changes</strong>: Modify table/seat counts</li>
                </ul>
                <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                    Each scenario runs N simulations (default 200) with a fixed seed for reproducibility.
                    Results are reported as mean, p10, p50, and p90 across all runs.
                </p>
            </div>

            {/* Limitations */}
            <div style={{ ...sectionStyle(), marginTop: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 10px" }}>Limitations</h2>
                <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                    <li>Single-week model — no seasonality or long-term trends</li>
                    <li>Simplified demand: groups arrive uniformly within each daypart</li>
                    <li>No delivery/takeaway modeling (dine-in only)</li>
                    <li>Linear price elasticity (constant across price range)</li>
                    <li>Kitchen modeled as single queue (no course-level detail)</li>
                    <li>Staff are homogeneous within role (no skill differentiation)</li>
                </ul>
            </div>

            <p style={{ color: "#999", fontSize: 11, marginTop: 20 }}>
                Built as part of a bachelor thesis at VŠE Prague, 2025. SimPy-based DES engine with React frontend.
            </p>
        </div>
    );
}
