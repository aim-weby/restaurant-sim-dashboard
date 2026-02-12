export const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }

    // 204 No Content — nothing to parse
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
}