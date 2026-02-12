import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
    exiting?: boolean;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

const ICONS: Record<ToastVariant, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
};

const STYLES: Record<ToastVariant, string> = {
    success: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
    error: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
    info: "bg-gradient-to-r from-deep-blue to-indigo-600 text-white",
    warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
};

const DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);

    const addToast = useCallback(
        (message: string, variant: ToastVariant = "info") => {
            const id = nextId.current++;
            setToasts((prev) => [...prev, { id, message, variant }]);
            setTimeout(() => dismissToast(id), DURATION);
        },
        [dismissToast]
    );

    const value: ToastContextValue = {
        toast: addToast,
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        info: (msg) => addToast(msg, "info"),
        warning: (msg) => addToast(msg, "warning"),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Toast container — bottom-right */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
                            backdrop-blur-md min-w-[280px] max-w-[420px]
                            transition-all duration-300 cursor-pointer
                            ${STYLES[t.variant]}
                            ${t.exiting ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0 animate-slide-in"}
                        `}
                        onClick={() => dismissToast(t.id)}
                    >
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {ICONS[t.variant]}
                        </span>
                        <span className="text-sm font-medium leading-snug">{t.message}</span>
                        <button
                            className="ml-auto text-white/60 hover:text-white transition text-lg leading-none flex-shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissToast(t.id);
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
