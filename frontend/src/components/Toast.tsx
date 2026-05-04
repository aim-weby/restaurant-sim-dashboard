/**
 * @fileoverview Toast notification system with Context API provider.
 *
 * Implements a global, non-blocking notification system accessible from any
 * component via the `useToast()` hook. Toasts appear in the bottom-right corner,
 * auto-dismiss after 4 seconds, and support four severity variants.
 *
 * Architecture:
 *   - `ToastProvider` wraps the app and provides the toast API via React Context.
 *   - `useToast()` hook gives any child component access to `toast.success()`,
 *     `toast.error()`, `toast.info()`, and `toast.warning()`.
 *   - Toast state (array of active toasts) is managed within the provider.
 *   - Each toast has a unique auto-incrementing ID for stable React keys.
 *   - Dismissal uses a two-phase animation: `exiting` flag triggers a CSS
 *     slide-out transition, then the toast is removed from state after 300ms.
 *
 * @module components/Toast
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Supported toast severity variants. */
export type ToastVariant = "success" | "error" | "info" | "warning";

/**
 * Internal toast state object.
 */
interface Toast {
    /** Unique auto-incrementing identifier for stable React keys. */
    id: number;
    /** Human-readable notification message. */
    message: string;
    /** Visual severity variant controlling icon and colour. */
    variant: ToastVariant;
    /** When true, triggers the exit animation before removal. */
    exiting?: boolean;
}

/**
 * Shape of the toast API provided via React Context.
 */
interface ToastContextValue {
    /** Generic toast method with explicit variant. */
    toast: (message: string, variant?: ToastVariant) => void;
    /** Shorthand for success notifications (green). */
    success: (message: string) => void;
    /** Shorthand for error notifications (red). */
    error: (message: string) => void;
    /** Shorthand for informational notifications (blue). */
    info: (message: string) => void;
    /** Shorthand for warning notifications (amber). */
    warning: (message: string) => void;
}

/** @internal Context instance — consumers must use `useToast()` hook instead. */
const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Access the toast notification API from any component.
 *
 * Must be called within a `<ToastProvider>` ancestor (which wraps the entire app).
 *
 * @returns The toast context with `success`, `error`, `info`, and `warning` methods.
 * @throws {Error} If called outside of a ToastProvider.
 *
 * @example
 * ```tsx
 * const toast = useToast();
 * toast.success("Week created successfully!");
 * toast.error(`Failed to save: ${error.message}`);
 * ```
 */
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

/** Icon displayed inside each toast variant's leading badge. */
const ICONS: Record<ToastVariant, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
};

/** Gradient background styles for each toast severity variant. */
const STYLES: Record<ToastVariant, string> = {
    success: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
    error: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
    info: "bg-gradient-to-r from-deep-blue to-indigo-600 text-white",
    warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
};

/** Auto-dismiss duration in milliseconds. */
const DURATION = 4000;

/**
 * Provider component that enables toast notifications throughout the app.
 *
 * Renders the toast container (fixed bottom-right) and provides the toast
 * API to all descendant components via React Context.
 *
 * @param children - The application tree to wrap.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    /** Array of currently visible toasts (newest = last). */
    const [toasts, setToasts] = useState<Toast[]>([]);
    /** Auto-incrementing counter for unique toast IDs. */
    const nextId = useRef(0);

    /**
     * Dismiss a toast with a two-phase animation:
     * 1. Set `exiting: true` to trigger the CSS slide-out transition.
     * 2. After 300ms (matching CSS transition duration), remove from state.
     */
    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);

    /**
     * Add a new toast to the notification stack and schedule auto-dismiss.
     */
    const addToast = useCallback(
        (message: string, variant: ToastVariant = "info") => {
            const id = nextId.current++;
            setToasts((prev) => [...prev, { id, message, variant }]);
            // Schedule automatic dismissal after DURATION ms
            setTimeout(() => dismissToast(id), DURATION);
        },
        [dismissToast]
    );

    /** Context value providing typed convenience methods. */
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

            {/* Toast container — fixed bottom-right, stacked vertically */}
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
                        {/* Severity icon badge */}
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {ICONS[t.variant]}
                        </span>
                        {/* Notification message */}
                        <span className="text-sm font-medium leading-snug">{t.message}</span>
                        {/* Explicit close button (stops propagation to prevent double-dismiss) */}
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
