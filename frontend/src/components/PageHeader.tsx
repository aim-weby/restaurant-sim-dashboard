import type { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-mariana">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-grey">{subtitle}</p>}
            </div>
            {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
        </div>
    );
}
