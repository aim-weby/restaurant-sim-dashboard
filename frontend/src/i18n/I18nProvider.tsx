import { createContext, useContext, useState, type ReactNode } from "react";

export type Locale = "cs" | "en";

const translations: Record<string, Record<Locale, string>> = {
    // Navigation
    "nav.baseline_weeks": { cs: "Základní týdny", en: "Baseline Weeks" },
    "nav.dayparts": { cs: "Denní části", en: "Dayparts" },
    "nav.costs": { cs: "Náklady", en: "Costs" },
    "nav.staffing": { cs: "Personál", en: "Staffing" },
    "nav.opening_hours": { cs: "Otevírací doba", en: "Opening Hours" },
    "nav.venue": { cs: "Provozovna", en: "Venue" },
    "nav.simulation": { cs: "Simulace", en: "Simulation" },
    "nav.report": { cs: "Report", en: "Report" },
    "nav.experiments": { cs: "Experimenty", en: "Experiments" },
    "nav.about": { cs: "O projektu", en: "About" },
    "nav.what_if": { cs: "Co kdyby…", en: "What If" },
    "nav.compare": { cs: "Porovnání", en: "Compare" },

    // Common
    "common.save": { cs: "Uložit", en: "Save" },
    "common.cancel": { cs: "Zrušit", en: "Cancel" },
    "common.delete": { cs: "Smazat", en: "Delete" },
    "common.loading": { cs: "Načítání…", en: "Loading…" },
    "common.error": { cs: "Chyba", en: "Error" },
    "common.success": { cs: "Úspěch", en: "Success" },
    "common.export_json": { cs: "Export JSON", en: "Export JSON" },
    "common.export_csv": { cs: "Export CSV", en: "Export CSV" },
    "common.export_pdf": { cs: "Export PDF", en: "Export PDF" },
    "common.reset": { cs: "Obnovit", en: "Reset" },
    "common.run": { cs: "Spustit", en: "Run" },
    "common.create": { cs: "Vytvořit", en: "Create" },

    // Dashboard
    "dashboard.title": { cs: "Přehled", en: "Dashboard" },
    "dashboard.revenue": { cs: "Tržby", en: "Revenue" },
    "dashboard.profit": { cs: "Zisk", en: "Profit" },
    "dashboard.costs": { cs: "Náklady", en: "Costs" },
    "dashboard.arrivals": { cs: "Příchody skupin", en: "Group Arrivals" },
    "dashboard.week": { cs: "Týden", en: "Week" },

    // KPIs
    "kpi.break_even": { cs: "Bod zvratu", en: "Break-Even Point" },
    "kpi.safety_margin": { cs: "Bezpečnostní marže", en: "Safety Margin" },
    "kpi.profit_margin": { cs: "Marže zisku", en: "Profit Margin" },
    "kpi.groups_week": { cs: "skupin / týden", en: "groups / week" },
    "kpi.groups_day": { cs: "skupin / den", en: "groups / day" },

    // What-If
    "whatif.title": { cs: "Průzkumník 'Co kdyby'", en: "What-If Explorer" },
    "whatif.subtitle": { cs: "Přetažením posuvníků okamžitě vidíte vliv změn na tržby, náklady a zisk.", en: "Drag sliders to instantly see how changes affect revenue, costs, and profit." },
    "whatif.reset_all": { cs: "↺ Obnovit vše", en: "↺ Reset all" },

    // Grid
    "grid.arrivals": { cs: "Příchody", en: "Arrivals" },
    "grid.avg_spend": { cs: "Průměr. útrata", en: "Avg Spend" },
    "grid.party_size": { cs: "Velikost skupiny", en: "Party Size" },
    "grid.undo": { cs: "Zpět", en: "Undo" },
    "grid.redo": { cs: "Vpřed", en: "Redo" },

    // Scenarios
    "scenario.templates": { cs: "Rychlé šablony", en: "Quick Templates" },
    "scenario.create": { cs: "Vytvořit scénář", en: "Create Scenario" },
    "scenario.name": { cs: "Název scénáře", en: "Scenario Name" },

    // Experiments
    "experiments.title": { cs: "Spouštěč experimentů", en: "Experiment Runner" },
    "experiments.tornado": { cs: "Citlivostní analýza — Dopad na zisk", en: "Sensitivity Tornado — Profit Impact" },
};

interface I18nContextType {
    locale: Locale;
    setLocale: (l: Locale) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
    locale: "cs",
    setLocale: () => { },
    t: (key) => key,
});

export function useI18n() { return useContext(I18nContext); }

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>(() => {
        try {
            const stored = localStorage.getItem("rs-locale");
            if (stored === "cs" || stored === "en") return stored;
        } catch { /* privacy */ }
        return "cs";
    });

    function handleSetLocale(l: Locale) {
        setLocale(l);
        try { localStorage.setItem("rs-locale", l); } catch { /* privacy */ }
    }

    function t(key: string): string {
        return translations[key]?.[locale] ?? key;
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}
