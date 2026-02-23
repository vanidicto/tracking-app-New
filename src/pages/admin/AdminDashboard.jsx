import { useEffect, useState } from "react";
import { adminMockService } from "../../services/adminMockService";
import { Users, Bell, Wifi } from "lucide-react";
import "./adminPages.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAlerts: 0,
    onlineDevices: 0,
  });

  useEffect(() => {
    setStats(adminMockService.getStats());

    // Optional: auto-refresh if other pages change localStorage
    const onStorage = () => setStats(adminMockService.getStats());
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Dashboard</h2>
        <p className="muted">Overview of system activity</p>
      </div>

      <div className="admin-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={20} />}
          tone="primary"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={<Bell size={20} />}
          tone={stats.activeAlerts ? "danger" : "neutral"}
        />
        <StatCard
          title="Online Devices"
          value={stats.onlineDevices}
          icon={<Wifi size={20} />}
          tone="success"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, tone = "neutral" }) {
  return (
    <div className={`admin-card ${tone}`}>
      <div className="admin-card-header">
        <div className="admin-card-title">{title}</div>
        {icon && <div className={`admin-card-icon ${tone}`}>{icon}</div>}
      </div>
      <div className="admin-card-value">{value}</div>
    </div>
  );
}
