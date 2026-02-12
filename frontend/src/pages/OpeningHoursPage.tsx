import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { OpeningHoursItem } from "../api/types";
import { sectionStyle } from "../utils/styles";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OpeningHoursPage() {
    const [rows, setRows] = useState<OpeningHoursItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        api.getOpeningHours().then(setRows);
    }, []);

    function update(weekday: number, field: keyof OpeningHoursItem, value: string | boolean) {
        setRows(prev =>
            prev.map(r => r.weekday === weekday ? { ...r, [field]: value } : r)
        );
        setDirty(true);
    }

    async function save() {
        setSaving(true);
        try {
            const res = await api.updateOpeningHours(
                rows.map(r => ({
                    weekday: r.weekday,
                    open_time: r.open_time,
                    close_time: r.close_time,
                    is_closed: r.is_closed,
                }))
            );
            setRows(res);
            setDirty(false);
        } catch (e) {
            alert(`Error saving: ${e}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
            <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Opening Hours</h1>
            <p style={{ color: "#666", fontSize: 13, margin: "6px 0 20px" }}>
                Set opening and closing times for each day of the week.
            </p>

            <div style={sectionStyle()}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #eee" }}>Day</th>
                            <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "2px solid #eee" }}>Open</th>
                            <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "2px solid #eee" }}>Close</th>
                            <th style={{ textAlign: "center", padding: "8px 12px", borderBottom: "2px solid #eee" }}>Closed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.weekday} style={{ opacity: r.is_closed ? 0.4 : 1 }}>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}>
                                    {WEEKDAYS[r.weekday]}
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                                    <input
                                        type="time"
                                        value={r.open_time}
                                        disabled={r.is_closed}
                                        onChange={e => update(r.weekday, "open_time", e.target.value)}
                                        style={{ padding: "4px 8px" }}
                                    />
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                                    <input
                                        type="time"
                                        value={r.close_time}
                                        disabled={r.is_closed}
                                        onChange={e => update(r.weekday, "close_time", e.target.value)}
                                        style={{ padding: "4px 8px" }}
                                    />
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={r.is_closed}
                                        onChange={e => update(r.weekday, "is_closed", e.target.checked)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={save}
                disabled={saving || !dirty}
                style={{
                    marginTop: 16,
                    padding: "8px 20px",
                    fontWeight: 700,
                    opacity: dirty ? 1 : 0.5,
                }}
            >
                {saving ? "Saving…" : "Save"}
            </button>
        </div>
    );
}
