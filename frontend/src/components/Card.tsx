import type { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    accent?: "blue" | "green" | "red" | "orange" | "none";
}

const accentColors = {
    blue: "border-l-deep-blue",
    green: "border-l-algae",
    red: "border-l-red-500",
    orange: "border-l-amber-500",
    none: "",
};

export default function Card({ children, className = "", accent = "none" }: CardProps) {
    return (
        <div className={`
            bg-white rounded-card border border-mist-dark/30
            shadow-sm hover:shadow-md transition-shadow duration-200
            ${accent !== "none" ? `border-l-4 ${accentColors[accent]}` : ""}
            ${className}
        `}>
            {children}
        </div>
    );
}
