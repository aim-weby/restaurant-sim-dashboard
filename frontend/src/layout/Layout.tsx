import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useKeyboardShortcuts, KeyboardShortcutHelp } from "../hooks/useKeyboardShortcuts";
import type { Shortcut } from "../hooks/useKeyboardShortcuts";
import Breadcrumbs from "../components/Breadcrumbs";
import AiAdvisorChat from "../components/AiAdvisorChat";

/* ── Sidebar icons (inline SVG paths) ── */
const icons: Record<string, string> = {
    "Baseline Weeks": "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    "Dayparts": "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    "Staffing": "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    "Costs": "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    "Venue": "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z",
    "Opening Hours": "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    "Simulation": "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    "Report": "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    "Experiments": "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
    "About & Methodology": "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
};

function NavIcon({ label }: { label: string }) {
    const d = icons[label];
    if (!d) return null;
    return (
        <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

const links = [
    {
        label: "Overview", items: [
            { to: "/baseline-weeks", label: "Baseline Weeks" },
        ]
    },
    {
        label: "Data Setup", items: [
            { to: "/dayparts", label: "Dayparts" },
            { to: "/staffing", label: "Staffing" },
            { to: "/settings/costs", label: "Costs" },
        ]
    },
    {
        label: "Settings", items: [
            { to: "/settings/venue", label: "Venue" },
            { to: "/settings/opening-hours", label: "Opening Hours" },
        ]
    },
    {
        label: "Analysis", items: [
            { to: "/simulation", label: "Simulation" },
            { to: "/report", label: "Report" },
            { to: "/experiments", label: "Experiments" },
        ]
    },
    {
        label: "Info", items: [
            { to: "/about", label: "About & Methodology" },
        ]
    },
];

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const navigate = useNavigate();


    const shortcuts: Shortcut[] = [
        { key: "b", ctrl: true, label: "Go to Baseline Weeks", action: () => navigate("/baseline-weeks") },
        { key: "d", ctrl: true, label: "Go to Report", action: () => navigate("/report") },
        { key: "e", ctrl: true, label: "Go to Experiments", action: () => navigate("/experiments") },
        { key: "?", label: "Toggle shortcut help", action: () => setHelpOpen((o) => !o) },
    ];

    useKeyboardShortcuts(shortcuts);

    return (
        <div className="flex min-h-screen">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-60 bg-mariana flex flex-col
                transition-transform duration-200
                lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-deep-blue to-algae flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-deep-blue/30">
                        RS
                    </div>
                    <div>
                        <div className="text-white font-semibold text-sm leading-tight">Restaurant</div>
                        <div className="text-white/50 text-xs leading-tight">Sim Dashboard</div>
                    </div>
                </div>

                {/* Nav groups */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                    {links.map((group) => (
                        <div key={group.label}>
                            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setSidebarOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150
                                            ${isActive
                                                ? "bg-deep-blue text-white font-medium shadow-lg shadow-deep-blue/30"
                                                : "text-white/70 hover:text-white hover:bg-white/8"
                                            }`
                                        }
                                    >
                                        <NavIcon label={item.label} />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom branding */}
                <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-white/25">BP Thesis · VŠE 2026</span>
                    <button
                        onClick={() => setHelpOpen(true)}
                        className="text-[10px] text-white/25 hover:text-white/60 transition"
                        title="Keyboard shortcuts (?)"
                    >
                        ⌨️
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar (mobile) */}
                <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-mist-dark/40 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-mist transition"
                        aria-label="Open menu"
                    >
                        <svg className="w-5 h-5 text-mariana" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="text-sm font-semibold text-mariana">Restaurant Sim</span>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Breadcrumbs />
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* AI Advisor Chat */}
            <AiAdvisorChat />

            {/* Keyboard shortcut help dialog */}
            <KeyboardShortcutHelp shortcuts={shortcuts} open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
}