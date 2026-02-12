import { useCallback, useRef, useState } from "react";

/**
 * Generic undo/redo hook.
 * Maintains a stack of snapshots.
 * `push(snapshot)` records a new state, `undo()` / `redo()` navigate.
 */
export function useUndoRedo<T>(initial: T, maxHistory = 50) {
    const [state, setState] = useState(initial);
    const past = useRef<T[]>([]);
    const future = useRef<T[]>([]);

    const push = useCallback((next: T) => {
        past.current = [...past.current.slice(-(maxHistory - 1)), state];
        future.current = [];
        setState(next);
    }, [state, maxHistory]);

    const replace = useCallback((next: T) => {
        setState(next);
    }, []);

    const undo = useCallback(() => {
        if (past.current.length === 0) return;
        const prev = past.current[past.current.length - 1];
        past.current = past.current.slice(0, -1);
        future.current = [...future.current, state];
        setState(prev);
    }, [state]);

    const redo = useCallback(() => {
        if (future.current.length === 0) return;
        const next = future.current[future.current.length - 1];
        future.current = future.current.slice(0, -1);
        past.current = [...past.current, state];
        setState(next);
    }, [state]);

    const reset = useCallback((initial: T) => {
        past.current = [];
        future.current = [];
        setState(initial);
    }, []);

    return {
        state,
        push,
        replace,
        undo,
        redo,
        reset,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
        historyLength: past.current.length,
    };
}
