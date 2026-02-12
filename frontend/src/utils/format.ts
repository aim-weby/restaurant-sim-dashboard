export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Safe numeric coercion — returns fallback if NaN/Infinity */
export function n(v: any, fallback = 0): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
}

export function fmtCurrency(v: number): string {
    return new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
    }).format(v);
}

export function fmtPercent(v: number): string {
    return `${(v * 100).toFixed(1)} %`;
}

export function fmtValue(metric: string, v: number): string {
    if (metric.startsWith("finance.") && !metric.endsWith("_ratio") && !metric.endsWith("_margin")) {
        return fmtCurrency(v);
    }
    if (metric.endsWith("_ratio") || metric.endsWith("_margin")) {
        return fmtPercent(v);
    }
    return v.toFixed(2);
}
