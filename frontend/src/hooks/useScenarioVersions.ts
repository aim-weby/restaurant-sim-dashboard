import { useCallback, useState } from "react";

export interface ScenarioVersion {
    id: string;
    name: string;
    timestamp: number;
    overrides: Record<string, any>;
    label: string;
}

const STORAGE_KEY = "rs-scenario-versions";

function loadAll(): Record<string, ScenarioVersion[]> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveAll(data: Record<string, ScenarioVersion[]>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* full */ }
}

/**
 * Hook for managing scenario version history.
 * Stores versions per scenario name in localStorage.
 */
export function useScenarioVersions(scenarioName: string) {
    const [versions, setVersions] = useState<ScenarioVersion[]>(() => {
        const all = loadAll();
        return all[scenarioName] ?? [];
    });

    const saveVersion = useCallback((overrides: Record<string, any>, label?: string) => {
        const version: ScenarioVersion = {
            id: crypto.randomUUID(),
            name: scenarioName,
            timestamp: Date.now(),
            overrides: { ...overrides },
            label: label ?? `v${(versions.length + 1)}`,
        };
        const updated = [...versions, version];
        setVersions(updated);
        const all = loadAll();
        all[scenarioName] = updated;
        saveAll(all);
        return version;
    }, [scenarioName, versions]);

    const deleteVersion = useCallback((versionId: string) => {
        const updated = versions.filter((v) => v.id !== versionId);
        setVersions(updated);
        const all = loadAll();
        all[scenarioName] = updated;
        saveAll(all);
    }, [scenarioName, versions]);

    const getVersion = useCallback((versionId: string) => {
        return versions.find((v) => v.id === versionId) ?? null;
    }, [versions]);

    return { versions, saveVersion, deleteVersion, getVersion };
}
