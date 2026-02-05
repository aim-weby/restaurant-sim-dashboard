import { useState } from "react";
import BaselineWeeksPage from "./pages/BaselineWeeksPage";
import BaselineGridPage from "./pages/BaselineGridPage";
import BaselineKpisPage from "./pages/BaselineKpisPage";

type View = "weeks" | "grid" | "kpis";

export default function App() {
    const [view, setView] = useState<View>("weeks");
    const [weekId, setWeekId] = useState<number | null>(null);

    if (view === "weeks") {
        return (
            <BaselineWeeksPage
                onOpenWeek={(id) => {
                    setWeekId(id);
                    setView("grid");
                }}
            />
        );
    }

    if (weekId === null) return <div style={{ padding: 24 }}>No week selected.</div>;

    if (view === "grid") {
        return (
            <div>
                <BaselineGridPage weekId={weekId} onBack={() => setView("weeks")} />
                <div style={{ padding: 24 }}>
                    <button onClick={() => setView("kpis")}>View KPI</button>
                </div>
            </div>
        );
    }

    return <BaselineKpisPage weekId={weekId} onBack={() => setView("grid")} />;
}