import { useCallback, useEffect, useRef } from "react";
import { useToast } from "../components/Toast";

/**
 * Auto-save hook — saves data to localStorage after a delay.
 * Shows a toast notification on save.
 */
export function useAutoSave<T>(
    key: string,
    data: T,
    { delay = 2000, enabled = true }: { delay?: number; enabled?: boolean } = {}
) {
    const toast = useToast();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialRef = useRef(true);

    useEffect(() => {
        // Skip initial save
        if (initialRef.current) {
            initialRef.current = false;
            return;
        }
        if (!enabled) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(`rs-draft:${key}`, JSON.stringify(data));
                toast.info("Draft auto-saved");
            } catch { /* storage full */ }
        }, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [key, data, delay, enabled, toast]);

    const loadDraft = useCallback((): T | null => {
        try {
            const stored = localStorage.getItem(`rs-draft:${key}`);
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    }, [key]);

    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(`rs-draft:${key}`); } catch { /* ok */ }
    }, [key]);

    return { loadDraft, clearDraft };
}
