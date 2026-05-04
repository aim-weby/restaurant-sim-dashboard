/**
 * @fileoverview Generic undo/redo state management hook.
 *
 * Provides a reusable undo/redo mechanism based on snapshot stacks.
 * Used primarily by the Baseline Grid Editor (BaselineGridPage) to let
 * users undo/redo cell edits with Ctrl+Z / Ctrl+Shift+Z.
 *
 * Architecture:
 *   Uses three independent `useState` hooks to track the current state,
 *   a `past` stack (for undo), and a `future` stack (for redo). This
 *   approach was chosen over `useReducer` to ensure that `canUndo` and
 *   `canRedo` are always reactive (derived from state.length, not refs).
 *
 * Stack Behaviour:
 *   - `push(snapshot)`: Records a new state, clears the redo stack.
 *   - `undo()`: Pops from past, pushes current to future.
 *   - `redo()`: Pops from future, pushes current to past.
 *   - `replace(snapshot)`: Updates current without recording history
 *     (for live-typing where intermediate states shouldn't be undoable).
 *   - `reset(initial)`: Clears all history and sets a new initial state.
 *
 * @module hooks/useUndoRedo
 */

import { useCallback, useState } from "react";

/**
 * Generic undo/redo hook that maintains a stack of state snapshots.
 *
 * @template T - The type of the state being tracked (e.g., `BaselineCell[]`).
 * @param initial - The initial state value.
 * @param maxHistory - Maximum number of past snapshots to retain (default: 50).
 *   Older entries are discarded to prevent unbounded memory growth.
 *
 * @returns An object containing:
 *   - `state` (T): The current state value.
 *   - `push` (fn): Record a new state snapshot (clears redo stack).
 *   - `replace` (fn): Update state without recording history.
 *   - `undo` (fn): Revert to the previous state.
 *   - `redo` (fn): Reapply the last undone state.
 *   - `reset` (fn): Clear all history and set a new initial state.
 *   - `canUndo` (boolean): Whether undo is available.
 *   - `canRedo` (boolean): Whether redo is available.
 *   - `historyLength` (number): Number of past states (for debug/display).
 *
 * @example
 * ```tsx
 * const { state, push, undo, redo, canUndo } = useUndoRedo(initialGrid);
 * // On cell edit:
 * push(newGrid);
 * // On Ctrl+Z:
 * if (canUndo) undo();
 * ```
 */
export function useUndoRedo<T>(initial: T, maxHistory = 50) {
    /** Current state visible to the component */
    const [state, setState] = useState(initial);
    /** Stack of previous states (most recent at the end) */
    const [past, setPast] = useState<T[]>([]);
    /** Stack of undone states for redo (most recent at the end) */
    const [future, setFuture] = useState<T[]>([]);

    /**
     * Record a new state snapshot. Pushes the current state onto the
     * past stack and clears the redo stack (branching invalidates redo).
     */
    const push = useCallback((next: T) => {
        setState((prev) => {
            // Trim past stack to maxHistory to prevent unbounded growth
            setPast((p) => [...p.slice(-(maxHistory - 1)), prev]);
            setFuture([]);
            return next;
        });
    }, [maxHistory]);

    /**
     * Update the current state without recording history. Used for
     * live-typing updates where each keystroke shouldn't be individually
     * undoable (e.g., mid-edit cell value changes).
     */
    const replace = useCallback((next: T) => {
        setState(next);
    }, []);

    /**
     * Revert to the most recent past state. Current state is pushed
     * to the future stack for potential redo.
     */
    const undo = useCallback(() => {
        setPast((p) => {
            if (p.length === 0) return p;
            const prev = p[p.length - 1];
            setState((current) => {
                setFuture((f) => [...f, current]);
                return prev;
            });
            return p.slice(0, -1);
        });
    }, []);

    /**
     * Reapply the most recently undone state. Current state is pushed
     * to the past stack.
     */
    const redo = useCallback(() => {
        setFuture((f) => {
            if (f.length === 0) return f;
            const next = f[f.length - 1];
            setState((current) => {
                setPast((p) => [...p, current]);
                return next;
            });
            return f.slice(0, -1);
        });
    }, []);

    /**
     * Clear all undo/redo history and set a new initial state.
     * Used when loading fresh data from the API.
     */
    const reset = useCallback((initial: T) => {
        setPast([]);
        setFuture([]);
        setState(initial);
    }, []);

    return {
        state,
        push,
        replace,
        undo,
        redo,
        reset,
        /** Whether at least one past snapshot exists for undo */
        canUndo: past.length > 0,
        /** Whether at least one future snapshot exists for redo */
        canRedo: future.length > 0,
        /** Number of past snapshots currently stored */
        historyLength: past.length,
    };
}
