import { useEffect, useRef, useCallback } from "react";

export interface Shortcut {
    key: string;              // e.g. "s", "r", "e", "?"
    ctrl?: boolean;           // require Ctrl/Cmd
    shift?: boolean;          // require Shift
    label: string;            // human-readable label, e.g. "Save"
    action: () => void;
}

/**
 * Register global keyboard shortcuts.
 * Shortcuts with `ctrl: true` fire on Ctrl+Key (or Cmd+Key on Mac).
 * All shortcuts are ignored when the user is typing in an input/textarea/select.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't intercept when user is typing
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        for (const s of shortcutsRef.current) {
            const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
            const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
            if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch) {
                e.preventDefault();
                s.action();
                return;
            }
        }
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * A small floating help dialog that shows keyboard shortcuts when the user presses `?`.
 */
export function KeyboardShortcutHelp({ shortcuts, open, onClose }: { shortcuts: Shortcut[]; open: boolean; onClose: () => void }) {
    if (!open) return null;

    function formatKey(s: Shortcut) {
        const parts: string[] = [];
        if (s.ctrl) parts.push("⌘/Ctrl");
        if (s.shift) parts.push("⇧");
        parts.push(s.key.toUpperCase());
        return parts.join(" + ");
    }

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-mariana flex items-center gap-2">
                        ⌨️ Keyboard Shortcuts
                    </h3>
                    <button onClick={onClose} className="w-6 h-6 rounded-full bg-mist/60 flex items-center justify-center text-grey hover:bg-mist hover:text-mariana transition text-sm">×</button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((s) => (
                        <div key={s.key + s.label} className="flex justify-between items-center">
                            <span className="text-sm text-mariana/80">{s.label}</span>
                            <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-mist/60 border border-mist-dark/30 text-xs font-mono font-semibold text-mariana">
                                {formatKey(s)}
                            </kbd>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-grey mt-4">Press <kbd className="px-1 py-0.5 rounded bg-mist/50 text-[10px] font-mono">?</kbd> to toggle this dialog.</p>
            </div>
        </div>
    );
}
