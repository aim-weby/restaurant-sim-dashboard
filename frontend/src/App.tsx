/**
 * @fileoverview Application root component — React Router configuration.
 *
 * Defines the complete routing tree for the Restaurant Simulation Dashboard.
 * All routes are nested under the shared `<Layout>` component, which provides
 * the sidebar navigation, header, and AI advisor chat panel.
 *
 * Route Architecture:
 *   - `/` redirects to `/baseline-weeks` (the natural entry point)
 *   - `/baseline-weeks/:weekId/*` — week-scoped pages (dashboard, grid, KPIs, scenarios)
 *   - `/settings/*` — global configuration pages (costs, venue, opening hours)
 *   - `/simulation`, `/report`, `/experiments` — analysis & comparison pages
 *   - `/about` — methodology documentation and KPI definitions
 *   - `*` — 404 catch-all
 *
 * State Management:
 *   No global state beyond React Router. Each page component independently
 *   fetches its data from the API via the `api` object. The `weekId` URL
 *   parameter connects week-scoped pages to the correct baseline data.
 *
 * @module App
 */

import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";

// --- Page components (lazy-loadable in future for code splitting) ---
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

/**
 * Root application component defining the React Router route tree.
 *
 * All routes are wrapped in the `<Layout>` component, which renders
 * the persistent sidebar, top navigation, and AI chat interface.
 *
 * @returns The complete route tree for the application.
 */
export default function App() {
    return (
        <Routes>
            {/* Layout wrapper provides sidebar + header for all pages */}
            <Route element={<Layout />}>
                {/* Default redirect: landing → baseline weeks list */}
                <Route path="/" element={<Navigate to="/baseline-weeks" replace />} />

                {/* ── Week-scoped pages (require :weekId parameter) ──────── */}
                {/* Main dashboard with KPI cards, charts, and quick simulation */}
                <Route path="/baseline-weeks/:weekId/dashboard" element={<DashboardPage />} />
                {/* Editable 7×D demand matrix (weekday × daypart grid) */}
                <Route path="/baseline-weeks/:weekId/grid" element={<BaselineGridPage />} />
                {/* Computed KPI breakdown with timeseries visualisations */}
                <Route path="/baseline-weeks/:weekId/kpis" element={<BaselineKpisPage />} />
                {/* What-if scenario builder and comparison */}
                <Route path="/baseline-weeks/:weekId/scenarios" element={<ScenariosPage />} />
                {/* Triangular distribution and behavioural model parameters */}
                <Route path="/baseline-weeks/:weekId/sim-params" element={<SimParamsPage />} />

                {/* ── Week list & management ─────────────────────────────── */}
                <Route path="/baseline-weeks" element={<BaselineWeeksPage />} />

                {/* ── Global settings pages ──────────────────────────────── */}
                <Route path="/settings/costs" element={<CostsSettingsPage />} />
                <Route path="/settings/venue" element={<VenueSettingsPage />} />
                <Route path="/settings/opening-hours" element={<OpeningHoursPage />} />
                <Route path="/staffing" element={<StaffingPage />} />
                <Route path="/dayparts" element={<DaypartsPage />} />

                {/* ── Analysis & simulation pages ────────────────────────── */}
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/experiments" element={<ExperimentsPage />} />

                {/* ── Documentation ──────────────────────────────────────── */}
                <Route path="/about" element={<AboutPage />} />

                {/* ── 404 catch-all ──────────────────────────────────────── */}
                <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
            </Route>
        </Routes>
    );
}