import { useState } from "react";
import BaselineWeeksPage from "./pages/BaselineWeeksPage";
import BaselineGridPage from "./pages/BaselineGridPage";

export default function App() {
    const [weekId, setWeekId] = useState<number | null>(null);

    if (weekId === null) {
        return <BaselineWeeksPage onOpenWeek={(id) => setWeekId(id)} />;
    }

    return <BaselineGridPage weekId={weekId} onBack={() => setWeekId(null)} />;
}
