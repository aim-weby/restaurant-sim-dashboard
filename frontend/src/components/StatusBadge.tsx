interface StatusBadgeProps {
    variant?: "success" | "warning" | "danger" | "info" | "neutral";
    children: React.ReactNode;
    className?: string;
}

const badgeStyles = {
    success: "bg-algae/15 text-green-800 border border-algae/30",
    warning: "bg-amber-100 text-amber-800 border border-amber-300/40",
    danger: "bg-red-100 text-red-700 border border-red-300/40",
    info: "bg-deep-blue/10 text-deep-blue border border-deep-blue/20",
    neutral: "bg-mist text-grey border border-mist-dark/40",
};

export default function StatusBadge({ variant = "neutral", children, className = "" }: StatusBadgeProps) {
    return (
        <span className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${badgeStyles[variant]} ${className}
        `}>
            {children}
        </span>
    );
}
