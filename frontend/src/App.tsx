import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";

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

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/baseline-weeks" replace />} />

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

                <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
            </Route>
        </Routes>
    );
}