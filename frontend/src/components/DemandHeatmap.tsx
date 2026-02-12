import { useMemo } from "react";
import type { BaselineCell } from "../api/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
    cells: BaselineCell[];
    metric: "arrivals" | "avg_spend" | "avg_party_size";
    onCellClick?: (cell: BaselineCell) => void;
    daypartLabels: Record<number, string>;
}

/**
 * Interactive color-coded heatmap for demand data.
 * Red = high, Blue = low (diverging palette).
 */
export default function DemandHeatmap({ cells, metric, onCellClick, daypartLabels }: Props) {
    const { grid, minVal, maxVal, dayparts } = useMemo(() => {
        const dayparts = [...new Set(cells.map((c) => c.daypart_id))].sort();
        const grid: Record<string, Record<number, BaselineCell>> = {};
        let minVal = Infinity, maxVal = -Infinity;

        cells.forEach((c) => {
            const val = c[metric] ?? 0;
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
            if (!grid[c.weekday]) grid[c.weekday] = {};
            grid[c.weekday][c.daypart_id] = c;
        });

        return { grid, minVal, maxVal, dayparts };
    }, [cells, metric]);

    function getColor(val: number) {
        const range = maxVal - minVal || 1;
        const t = (val - minVal) / range; // 0..1
        // Cool (blue) to Warm (red) palette
        const r = Math.round(30 + t * 225);
        const g = Math.round(120 + (1 - Math.abs(t - 0.5) * 2) * 80);
        const b = Math.round(255 - t * 225);
        return `rgb(${r}, ${g}, ${b})`;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="px-2 py-1.5 text-[10px] text-grey font-medium text-left" />
                        {dayparts.map((dp) => (
                            <th key={dp} className="px-2 py-1.5 text-[10px] text-grey font-medium text-center">
                                {daypartLabels[dp] ?? `DP ${dp}`}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {WEEKDAYS.map((day) => (
                        <tr key={day}>
                            <td className="px-2 py-0.5 text-[10px] font-semibold text-mariana whitespace-nowrap">{day}</td>
                            {dayparts.map((dp) => {
                                const cell = grid[day]?.[dp];
                                const val = cell ? (cell[metric] ?? 0) : 0;
                                return (
                                    <td key={dp} className="px-1 py-0.5">
                                        <button
                                            className="w-full h-9 rounded-md text-white text-[10px] font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                                            style={{ backgroundColor: getColor(val) }}
                                            onClick={() => cell && onCellClick?.(cell)}
                                            title={`${day} / ${daypartLabels[dp] ?? dp}: ${val}`}
                                        >
                                            {val.toFixed(metric === "arrivals" ? 0 : 1)}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Color legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-grey">
                <span>Low</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgb(30,120,255), rgb(142,160,170), rgb(255,120,30))` }} />
                <span>High</span>
            </div>
        </div>
    );
}
