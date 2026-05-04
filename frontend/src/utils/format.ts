/**
 * @fileoverview Formatting utilities and shared constants for the frontend.
 *
 * This module is the **single source of truth** for:
 * - Weekday label arrays (abbreviated and full-name)
 * - Numeric formatting for currency, percentages, and simulation metrics
 * - Statistical helper functions (sum, median)
 * - Metric key humanisation (niceKey)
 *
 * All formatting functions use the Czech locale (`cs-CZ`) and CZK currency
 * by default, matching the domain of the Bachelor's thesis.
 *
 * @module utils/format
 */

// ---------------------------------------------------------------------------
// Weekday constants
// ---------------------------------------------------------------------------

/** Abbreviated weekday labels for charts and table headers (Mon–Sun). */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Full weekday names for settings pages and accessibility labels. */
export const WEEKDAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// ---------------------------------------------------------------------------
// Numeric coercion
// ---------------------------------------------------------------------------

/**
 * Safe numeric coercion with fallback for non-finite values.
 *
 * Used extensively when reading KPI values from the API, where a metric
 * may be `null`, `undefined`, or `NaN` if data is incomplete.
 *
 * @param v - Value to coerce (may be string, null, undefined, or number).
 * @param fallback - Value to return if coercion produces NaN or Infinity.
 * @returns A finite number, or the fallback value.
 */
export function n(v: any, fallback = 0): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
}

// ---------------------------------------------------------------------------
// Currency & percentage formatting
// ---------------------------------------------------------------------------

/**
 * Format a number as Czech Koruna currency (e.g., "12 345 Kč").
 *
 * Uses `Intl.NumberFormat` with the `cs-CZ` locale for proper
 * thousands separation and CZK symbol placement.
 *
 * @param v - Numeric value in CZK.
 * @returns Locale-formatted currency string with no decimal places.
 */
export function fmtCurrency(v: number): string {
    return new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
    }).format(v);
}

/**
 * Format a decimal ratio as a percentage string (e.g., 0.305 → "30.5 %").
 *
 * @param v - Decimal ratio (0.0–1.0 range, though values outside are accepted).
 * @returns Formatted percentage with one decimal place.
 */
export function fmtPercent(v: number): string {
    return `${(v * 100).toFixed(1)} %`;
}

/**
 * Format a number to one decimal place (e.g., 12.345 → "12.3").
 *
 * @param v - Numeric value.
 * @returns String with exactly one decimal digit.
 */
export function fmtNum(v: number): string {
    return v.toFixed(1);
}

// ---------------------------------------------------------------------------
// Metric-aware formatting
// ---------------------------------------------------------------------------

/**
 * Intelligently format a simulation metric value based on its metric key.
 *
 * This function acts as a dispatcher that infers the appropriate number format
 * from the metric's namespace prefix or suffix:
 * - `finance.*` (excluding ratios) → CZK currency
 * - `*_ratio` / `*_margin` → percentage
 * - `util.*` → percentage (0–1 utilisation ratio)
 * - `queue.*` / `time.*` → minutes
 * - Everything else → generic 2-decimal number
 *
 * @param metric - Dot-separated metric key (e.g., "finance.revenue", "util.kitchen").
 * @param v - Raw numeric value from the simulation engine.
 * @returns Human-readable formatted string with appropriate unit.
 */
export function fmtValue(metric: string, v: number): string {
    if (metric.startsWith("finance.") && !metric.endsWith("_ratio") && !metric.endsWith("_margin")) {
        return fmtCurrency(v);
    }
    if (metric.endsWith("_ratio") || metric.endsWith("_margin")) {
        return fmtPercent(v);
    }
    if (metric.startsWith("util.")) {
        return `${(v * 100).toFixed(1)} %`;
    }
    if (metric.startsWith("queue.") || metric.startsWith("time.")) {
        return `${fmtNum(v)} min`;
    }
    return v.toFixed(2);
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

/**
 * Compute the sum of a numeric array.
 *
 * @param arr - Array of numbers.
 * @returns Sum of all elements (0 for empty arrays via reduce identity).
 */
export function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Compute the median of a numeric array.
 *
 * For even-length arrays, returns the average of the two middle values.
 * Returns 0 for empty input.
 *
 * @param values - Array of numeric observations.
 * @returns The median value.
 */
export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const v = [...values].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Format a decimal ratio as a compact percentage (e.g., 0.85 → "85%").
 * No decimal places, no space before the percent sign.
 *
 * @param v - Decimal ratio.
 * @returns Compact percentage string.
 */
export function pct(v: number): string {
    return `${(v * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// Metric key humanisation
// ---------------------------------------------------------------------------

/**
 * Convert a dot-separated metric key into a human-readable label.
 *
 * Extracts the last segment, replaces underscores with spaces, and title-cases
 * each word. Example: "finance.profit_margin" → "Profit Margin".
 *
 * @param k - Dot-separated metric key (e.g., "demand.lost_groups").
 * @returns Title-cased, space-separated human-readable label.
 */
export function niceKey(k: string): string {
    return k.split(".").pop()?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? k;
}
