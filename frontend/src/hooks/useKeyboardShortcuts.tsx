/**
 * @fileoverview Global keyboard shortcuts hook and help dialog component.
 *
 * Provides two exports:
 * - `useKeyboardShortcuts(shortcuts)`: Registers global keyboard event listeners
 *   that trigger actions when specific key combinations are pressed.
 * - `KeyboardShortcutHelp`: A floating modal that displays all available shortcuts
 *   in a user-friendly format (toggled with the `?` key).
 *
 * Design Decisions:
 *   - Shortcuts are stored in a `useRef` to avoid re-registering the event
 *     listener when shortcut actions change (stable handler reference).
 *   - Input/textarea/select elements are excluded to prevent shortcuts from
 *     interfering with text input.
 *   - Both `Ctrl` and `Cmd` (Meta) are supported for cross-platform compatibility.
 *
 * @module hooks/useKeyboardShortcuts
 */

import { useEffect, useRef, useCallback } from "react";

/**
 * Definition of a single keyboard shortcut.
 */
export interface Shortcut {
    /** The key to listen for (e.g., "s", "r", "e", "?"). Case-insensitive. */
    key: string;
    /** If true, requires Ctrl (Windows/Linux) or Cmd (Mac) modifier. */
    ctrl?: boolean;
    /** If true, requires the Shift modifier. */
    shift?: boolean;
    /** Human-readable description shown in the help dialog (e.g., "Save"). */
    label: string;
    /** Callback function to execute when the shortcut is triggered. */
    action: () => void;
}

/**
 * Register global keyboard shortcuts.
 *
 * Attaches a single `keydown` event listener to `window` that matches
 * pressed keys against the provided shortcut definitions. Shortcuts
 * with `ctrl: true` fire on `Ctrl+Key` (or `Cmd+Key` on macOS).
 *
 * All shortcuts are automatically suppressed when the user is typing
 * in an `<input>`, `<textarea>`, or `<select>` element.
 *
 * @param shortcuts - Array of shortcut definitions to register. The array
 *   reference can change without causing listener re-registration (stored
 *   in a ref for performance).
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *     { key: "s", ctrl: true, label: "Save", action: handleSave },
 *     { key: "z", ctrl: true, label: "Undo", action: handleUndo },
 *     { key: "?", label: "Help", action: () => setHelpOpen(true) },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    /** Ref holding the latest shortcuts array — avoids event listener churn. */
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    /**
     * Global keydown handler. Iterates through registered shortcuts and
     * fires the matching action, preventing the browser's default behaviour.
     */
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't intercept when user is actively typing in a form element
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        for (const s of shortcutsRef.current) {
            // Ctrl/Cmd matching: if shortcut requires ctrl, check both ctrlKey and metaKey
            const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
            // Shift matching: if shortcut requires shift, ensure it's pressed; otherwise ensure it's not
            const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
            if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch) {
                e.preventDefault();
                s.action();
                return;
            }
        }
    }, []);

    // Attach/detach the global listener on mount/unmount
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Floating help dialog that displays all registered keyboard shortcuts.
 *
 * Rendered as a centered modal overlay with a blurred backdrop. Typically
 * toggled by pressing the `?` key.
 *
 * @param shortcuts - The same array of shortcuts passed to `useKeyboardShortcuts`.
 * @param open - Whether the dialog is currently visible.
 * @param onClose - Callback to close the dialog.
 */
export function KeyboardShortcutHelp({ shortcuts, open, onClose }: { shortcuts: Shortcut[]; open: boolean; onClose: () => void }) {
    if (!open) return null;

    /**
     * Format a shortcut's key combination for display.
     * Produces strings like "⌘/Ctrl + S" or "⇧ + R".
     */
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
                    <button onClick={onClose} aria-label="Close" className="w-6 h-6 rounded-full bg-mist/60 flex items-center justify-center text-grey hover:bg-mist hover:text-mariana transition text-sm">×</button>
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
