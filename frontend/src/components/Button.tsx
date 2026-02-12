import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    children: ReactNode;
}

const variants = {
    primary: "bg-deep-blue text-white hover:bg-deep-blue-light active:bg-deep-blue-dark shadow-sm",
    secondary: "bg-white text-mariana border border-mist-dark/50 hover:bg-mist/50 active:bg-mist",
    success: "bg-algae text-mariana hover:bg-algae-dark active:bg-algae-dark shadow-sm",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
    ghost: "text-mariana hover:bg-mist/60 active:bg-mist",
};

const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
};

export default function Button({
    variant = "primary",
    size = "md",
    children,
    className = "",
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
                inline-flex items-center justify-center gap-2 font-medium rounded-btn
                transition-all duration-150 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            {...props}
        >
            {children}
        </button>
    );
}
