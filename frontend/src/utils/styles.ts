import type React from "react";

export function cardStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.75)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}

export function sectionStyle(): React.CSSProperties {
    return {
        border: "1px solid #e6e6e6",
        borderRadius: 18,
        padding: 14,
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        backdropFilter: "blur(6px)",
    };
}
