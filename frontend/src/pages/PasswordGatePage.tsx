/**
 * @fileoverview Password gate page — shown before the app is accessible.
 *
 * A simple password prompt rendered at the app root when the user has
 * not yet authenticated. The password is stored only in sessionStorage
 * (cleared when the browser tab/window closes). No server-side session
 * or token is used — this is a lightweight demo-protection mechanism
 * intended to prevent casual access during thesis review, not a production
 * security system.
 *
 * The correct password is read from the VITE_APP_PASSWORD environment
 * variable at build time. If the variable is not set, the gate is
 * bypassed automatically (safe for local development).
 */

import { useState, type FormEvent } from "react";

interface PasswordGatePageProps {
    onUnlock: () => void;
}

export default function PasswordGatePage({ onUnlock }: PasswordGatePageProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState(false);
    const [shaking, setShaking] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const correct = import.meta.env.VITE_APP_PASSWORD ?? "";
        if (!correct || value === correct) {
            onUnlock();
        } else {
            setError(true);
            setShaking(true);
            setTimeout(() => setShaking(false), 600);
            setValue("");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-6">
            {/* Decorative background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-3xl" />
            </div>

            <div
                className={`relative w-full max-w-sm transition-all duration-150 ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
                style={shaking ? { animation: "shake 0.5s ease-in-out" } : {}}
            >
                {/* Logo / brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Restaurant Simulation</h1>
                    <p className="text-slate-400 text-sm">Dashboard — Bachelor's Thesis Demo</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <h2 className="text-sm font-semibold text-slate-200">Access required</h2>
                    </div>

                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        This application is protected. Please enter the access password provided by the author.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Password
                            </label>
                            <input
                                id="gate-password"
                                type="password"
                                autoFocus
                                autoComplete="current-password"
                                value={value}
                                onChange={e => { setValue(e.target.value); setError(false); }}
                                placeholder="Enter password…"
                                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 text-sm
                                    outline-none transition-all duration-200
                                    ${error
                                        ? "border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                                        : "border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                                    }`}
                            />
                            {error && (
                                <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Incorrect password. Please try again.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600
                                hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm
                                transition-all duration-200 shadow-lg shadow-blue-500/20
                                hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Enter Application →
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    VŠE Prague · Bachelor's Thesis · 2025
                </p>
            </div>

            {/* Shake animation */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
            `}</style>
        </div>
    );
}
