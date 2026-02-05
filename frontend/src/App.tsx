import { useEffect, useState } from "react";

type HealthResponse = { status: string };

export default function App() {
    const [health, setHealth] = useState<string>("loading...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("http://localhost:8000/health")
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return (await res.json()) as HealthResponse;
            })
            .then((data) => setHealth(data.status))
            .catch((e) => setError(String(e)));
    }, []);

    return (
        <div style={{ fontFamily: "system-ui", padding: 24 }}>
            <h1>Restaurant Simulation Dashboard</h1>
            <p>Backend health: {error ? `ERROR: ${error}` : health}</p>
        </div>
    );
}
