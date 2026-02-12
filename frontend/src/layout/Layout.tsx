import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "8px 10px",
    borderRadius: 10,
    textDecoration: "none",
    color: isActive ? "white" : "#ddd",
    background: isActive ? "#333" : "transparent",
    border: "1px solid #444",
});

export default function Layout() {
    return (
        <div style={{ fontFamily: "system-ui", minHeight: "100vh" }}>
            <div style={{ padding: 16, borderBottom: "1px solid #222", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <NavLink to="/baseline-weeks" style={linkStyle}>Baseline weeks</NavLink>
                <NavLink to="/settings/costs" style={linkStyle}>Costs</NavLink>
                <NavLink to="/staffing" style={linkStyle}>Staffing</NavLink>
                <NavLink to="/simulation" style={linkStyle}>Simulation</NavLink>
                <NavLink to="/settings/venue" style={linkStyle}>Venue</NavLink>
                <NavLink to="/report" style={linkStyle}>Report</NavLink>
            </div>

            <Outlet />
        </div>
    );
}