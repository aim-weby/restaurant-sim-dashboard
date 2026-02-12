import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeContextType = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggle: () => { } });

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const stored = localStorage.getItem("rs-theme");
            if (stored === "dark" || stored === "light") return stored;
        } catch { /* SSR / privacy */ }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try { localStorage.setItem("rs-theme", theme); } catch { /* privacy */ }
    }, [theme]);

    function toggle() { setTheme((t) => (t === "light" ? "dark" : "light")); }

    return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
