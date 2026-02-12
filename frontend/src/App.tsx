import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";

import DashboardPage from "./pages/DashboardPage";
import BaselineWeeksPage from "./pages/BaselineWeeksPage";
import BaselineGridPage from "./pages/BaselineGridPage";
import BaselineKpisPage from "./pages/BaselineKpisPage";
import CostsSettingsPage from "./pages/CostsSettingsPage";
import StaffingPage from "./pages/StaffingPage";
import SimulationPage from "./pages/SimulationPage";
import ReportPage from "./pages/ReportPage";
import ScenariosPage from "./pages/ScenariosPage";
import DaypartsPage from "./pages/DaypartsPage";
import VenueSettingsPage from "./pages/VenueSettingsPage";
import SimParamsPage from "./pages/SimParamsPage";
import ExperimentsPage from "./pages/ExperimentsPage";
import OpeningHoursPage from "./pages/OpeningHoursPage";
import AboutPage from "./pages/AboutPage";
import WhatIfPage from "./pages/WhatIfPage";
import GoalSeekPage from "./pages/GoalSeekPage";
import TrendPage from "./pages/TrendPage";
import ComparePage from "./pages/ComparePage";

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/baseline-weeks" replace />} />

                <Route path="/baseline-weeks/:weekId/dashboard" element={<DashboardPage />} />

                <Route path="/baseline-weeks" element={<BaselineWeeksPage />} />
                <Route path="/baseline-weeks/:weekId/grid" element={<BaselineGridPage />} />
                <Route path="/baseline-weeks/:weekId/kpis" element={<BaselineKpisPage />} />
                <Route path="/baseline-weeks/:weekId/scenarios" element={<ScenariosPage />} />

                <Route path="/settings/costs" element={<CostsSettingsPage />} />
                <Route path="/staffing" element={<StaffingPage />} />

                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/report" element={<ReportPage />} />

                <Route path="/dayparts" element={<DaypartsPage />} />
                <Route path="/settings/venue" element={<VenueSettingsPage />} />
                <Route path="/baseline-weeks/:weekId/sim-params" element={<SimParamsPage />} />
                <Route path="/experiments" element={<ExperimentsPage />} />
                <Route path="/settings/opening-hours" element={<OpeningHoursPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Wave 2 routes */}
                <Route path="/what-if" element={<WhatIfPage />} />
                <Route path="/goal-seek" element={<GoalSeekPage />} />
                <Route path="/trends" element={<TrendPage />} />
                <Route path="/compare" element={<ComparePage />} />

                <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
            </Route>
        </Routes>
    );
}