import { Link, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
    "": "Home",
    "baseline-weeks": "Baseline Weeks",
    dashboard: "Dashboard",
    grid: "Grid Editor",
    kpis: "KPIs",
    report: "Report",
    simulation: "Simulation",
    experiments: "Experiments",
    scenarios: "Scenarios",
    settings: "Settings",
    about: "About",
};

export default function Breadcrumbs() {
    const { pathname } = useLocation();
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length <= 1) return null;

    const crumbs = segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = LABELS[seg] ?? (isNaN(Number(seg)) ? seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : `#${seg}`);
        const isLast = i === segments.length - 1;
        return { label, path, isLast };
    });

    return (
        <nav className="flex items-center gap-1.5 text-[11px] text-grey mb-4">
            <Link to="/" className="hover:text-deep-blue transition">🏠</Link>
            {crumbs.map((c) => (
                <span key={c.path} className="flex items-center gap-1.5">
                    <span className="text-grey/40">/</span>
                    {c.isLast ? (
                        <span className="text-mariana font-medium">{c.label}</span>
                    ) : (
                        <Link to={c.path} className="hover:text-deep-blue transition">{c.label}</Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
