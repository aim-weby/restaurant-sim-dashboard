/**
 * AiPageContext — lets any page push a structured data snapshot into the
 * global AI Advisor chat so the model can answer page-specific questions.
 *
 * Usage (in any page component):
 *
 *   import { useSetAiPageContext } from "../context/AiPageContext";
 *
 *   const setAiCtx = useSetAiPageContext();
 *   useEffect(() => {
 *     setAiCtx({ page: "staffing", data: rows });
 *     return () => setAiCtx(null);   // clear on unmount
 *   }, [rows]);
 */

import { createContext, useContext, useState, type ReactNode } from "react";

type PageContextValue = Record<string, unknown> | null;

interface AiPageContextType {
    pageContext: PageContextValue;
    setPageContext: (ctx: PageContextValue) => void;
}

const AiPageContext = createContext<AiPageContextType>({
    pageContext: null,
    setPageContext: () => {},
});

export function AiPageContextProvider({ children }: { children: ReactNode }) {
    const [pageContext, setPageContext] = useState<PageContextValue>(null);
    return (
        <AiPageContext.Provider value={{ pageContext, setPageContext }}>
            {children}
        </AiPageContext.Provider>
    );
}

/** Read the current page context (used by AiAdvisorChat). */
export function useAiPageContext() {
    return useContext(AiPageContext).pageContext;
}

/** Set the current page context (used by individual pages). */
export function useSetAiPageContext() {
    return useContext(AiPageContext).setPageContext;
}
