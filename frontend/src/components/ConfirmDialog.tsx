/**
 * @fileoverview Accessible confirmation dialog component.
 *
 * A reusable modal dialog for destructive or important actions (e.g., deleting
 * a baseline week, removing a scenario). Implements full WAI-ARIA dialog
 * accessibility patterns:
 *
 * Accessibility Features:
 *   - `role="dialog"` with `aria-modal="true"`
 *   - `aria-labelledby` and `aria-describedby` for screen readers
 *   - Auto-focus on the Cancel button (safe default to prevent accidental confirms)
 *   - Escape key dismissal
 *   - Focus trap (Tab cycling within the dialog)
 *   - Click-outside-to-close via the backdrop
 *
 * @module components/ConfirmDialog
 */

import { useEffect, useRef } from "react";
import Button from "./Button";

/**
 * Props for the ConfirmDialog component.
 */
interface ConfirmDialogProps {
    /** Whether the dialog is currently visible. */
    open: boolean;
    /** Dialog heading text (e.g., "Delete baseline week?"). */
    title: string;
    /** Descriptive body text explaining the consequences of the action. */
    message: string;
    /** Label for the confirm button (default: "Confirm"). */
    confirmLabel?: string;
    /** Label for the cancel button (default: "Cancel"). */
    cancelLabel?: string;
    /** Visual variant — "danger" (red) for destructive actions, "primary" (blue) for neutral. */
    variant?: "danger" | "primary";
    /** Callback fired when the user confirms the action. */
    onConfirm: () => void;
    /** Callback fired when the user cancels (Escape, backdrop click, or Cancel button). */
    onCancel: () => void;
}

/**
 * Modal confirmation dialog with accessibility support.
 *
 * Renders a centered dialog over a blurred backdrop. The dialog traps focus,
 * responds to Escape key, and auto-focuses the Cancel button to make the
 * safe action the default choice.
 *
 * @param props - See {@link ConfirmDialogProps}.
 * @returns The dialog JSX, or `null` when `open` is false.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *     open={deleteTarget !== null}
 *     title="Delete week?"
 *     message="This will permanently delete all data for this week."
 *     variant="danger"
 *     onConfirm={() => deleteWeek(deleteTarget)}
 *     onCancel={() => setDeleteTarget(null)}
 * />
 * ```
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    /** Ref to the dialog container element (for focus trap query). */
    const dialogRef = useRef<HTMLDivElement>(null);
    /** Ref to the Cancel button (for auto-focus on open). */
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Auto-focus the Cancel button when dialog opens — this prevents
    // accidental confirmation and follows UX best practices for destructive dialogs
    useEffect(() => {
        if (open) {
            // requestAnimationFrame ensures the DOM is painted before focusing
            requestAnimationFrame(() => cancelRef.current?.focus());
        }
    }, [open]);

    // Escape key handler — allows keyboard dismissal of the dialog
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    // Focus trap — prevents Tab from moving focus outside the dialog,
    // cycling between the first and last focusable elements instead
    useEffect(() => {
        if (!open) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;
            const focusable = dialog.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                // Shift+Tab on first element → wrap to last
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab on last element → wrap to first
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open]);

    // Don't render anything when the dialog is closed
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
        >
            {/* Semi-transparent backdrop — click to dismiss */}
            <div
                className="absolute inset-0 bg-mariana/40 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
                aria-hidden="true"
            />
            {/* Dialog card */}
            <div
                ref={dialogRef}
                className="relative bg-white rounded-2xl shadow-2xl border border-mist-dark/10 p-6 w-full max-w-sm mx-4 animate-scale-in"
            >
                <h3 id="confirm-dialog-title" className="text-base font-bold text-mariana mb-2">{title}</h3>
                <p id="confirm-dialog-message" className="text-sm text-grey leading-relaxed mb-5">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button ref={cancelRef} variant="ghost" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant={variant === "danger" ? "danger" : "primary"} size="sm" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
