import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import PasswordGatePage from "./pages/PasswordGatePage";
import { ToastProvider } from "./components/Toast";
import "./index.css";

const STORAGE_KEY = "rsd_unlocked";

function Root() {
    const [unlocked, setUnlocked] = useState<boolean>(() => {
        // If no password is configured, bypass the gate entirely (local dev)
        const pwd = import.meta.env.VITE_APP_PASSWORD ?? "";
        if (!pwd) return true;
        return sessionStorage.getItem(STORAGE_KEY) === "1";
    });

    function handleUnlock() {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setUnlocked(true);
    }

    if (!unlocked) {
        return <PasswordGatePage onUnlock={handleUnlock} />;
    }

    return (
        <BrowserRouter>
            <ToastProvider>
                <App />
            </ToastProvider>
        </BrowserRouter>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>
);

