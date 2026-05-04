/**
 * @fileoverview Low-level HTTP client for communicating with the FastAPI backend.
 *
 * Provides a single generic `fetchJson<T>` function that handles:
 * - Base URL resolution from the `VITE_API_URL` environment variable
 * - Automatic `Content-Type: application/json` header injection for request bodies
 * - HTTP error extraction with status code, status text, and response body
 * - Transparent handling of 204 No Content responses (e.g., DELETE endpoints)
 *
 * All API endpoint functions in `endpoints.ts` delegate to this utility,
 * ensuring consistent error handling and request formatting across the app.
 *
 * @module api/client
 */

/**
 * Base URL for all API requests. Falls back to localhost:8000 when the
 * VITE_API_URL environment variable is not set (development default).
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/**
 * Execute an HTTP request to the API and parse the JSON response.
 *
 * This is the foundational HTTP abstraction used by all API endpoint functions.
 * It wraps the native Fetch API with JSON-specific defaults and error handling.
 *
 * @template T - The expected shape of the parsed JSON response.
 * @param path - API path (appended to API_BASE), e.g., "/baseline-weeks".
 * @param options - Standard RequestInit options (method, body, headers, etc.).
 * @returns Parsed JSON response cast to type T, or undefined for 204 responses.
 * @throws {Error} On non-2xx HTTP responses, with the status code, status text,
 *   and response body included in the error message for debugging.
 */
export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            // Only set Content-Type for requests with a body (POST, PUT, PATCH)
            ...(options?.body ? { "Content-Type": "application/json" } : {}),
            ...(options?.headers ?? {}),
        },
    });

    if (!res.ok) {
        // Extract error body for descriptive error messages
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }

    // 204 No Content — nothing to parse (typical for DELETE responses)
    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
}