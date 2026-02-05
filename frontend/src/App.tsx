import { useState } from "react";
import BaselineWeeksPage from "./pages/BaselineWeeksPage";
import BaselineGridPage from "./pages/BaselineGridPage";
import BaselineKpisPage from "./pages/BaselineKpisPage";
import CostsSettingsPage from "./pages/CostsSettingsPage";
import StaffingPage from "./pages/StaffingPage";
import SimulationPage from "./pages/SimulationPage";

type View = "weeks" | "grid" | "kpis" | "costs" | "staffing" | "simulation";

export default function App() {
    const [view, setView] = useState<View>("weeks");
    const [weekId, setWeekId] = useState<number | null>(null);

    function Nav() {
        return (
            <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
                <button onClick={() => setView("weeks")}>Baseline weeks</button>
                <button onClick={() => setView("costs")}>Costs</button>
                <button onClick={() => setView("staffing")}>Staffing</button>
                <button onClick={() => setView("simulation")}>Simulation</button>
                {weekId !== null && <button onClick={() => setView("grid")}>Grid (week #{weekId})</button>}
                {weekId !== null && <button onClick={() => setView("kpis")}>KPI (week #{weekId})</button>}
            </div>
        );
    }

    if (view === "costs") {
        return (
            <>
                <Nav />
                <CostsSettingsPage onBack={() => setView("weeks")} />
            </>
        );
    }

    if (view === "staffing") {
        return (
            <>
                <Nav />
                <StaffingPage onBack={() => setView("weeks")} />
            </>
        );
    }

    if (view === "simulation") {
        return (
            <>
                <Nav />
                <SimulationPage baselineWeekId={weekId} />
            </>
        );
    }

    if (view === "weeks") {
        return (
            <>
                <Nav />
                <BaselineWeeksPage
                    onOpenWeek={(id) => {
                        setWeekId(id);
                        setView("grid");
                    }}
                />
            </>
        );
    }

    if (weekId === null) {
        return (
            <>
                <Nav />
                <div style={{ padding: 24 }}>Select a week first.</div>
            </>
        );
    }

    if (view === "grid") {
        return (
            <>
                <Nav />
                <BaselineGridPage weekId={weekId} onBack={() => setView("weeks")} />
            </>
        );
    }

    return (
        <>
            <Nav />
            <BaselineKpisPage weekId={weekId} onBack={() => setView("grid")} />
        </>
    );
}