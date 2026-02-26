import { useEffect, useState } from "react";
import { adminMockService } from "../../services/adminMockService";
import { Users, Wifi, Server, Activity } from "lucide-react";
import "./adminPages.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    serverUptime: "Loading...",
    totalUsers: 0,
    connectedBracelets: 0,
    packetMetrics: 0,
  });

  useEffect(() => {
    setStats(adminMockService.getStats());

    // Optional: auto-refresh if other pages change localStorage
    const onStorage = () => setStats(adminMockService.getStats());
    window.addEventListener("storage", onStorage);

    // Simulate live packet updates every 5 seconds just for visual effect
    const interval = setInterval(() => {
      setStats(adminMockService.getStats());
    }, 5000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Dashboard</h2>
        <p className="muted">Anonymized System Overview</p>
      </div>

      <div className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <StatCard
          title="Server Uptime"
          value={stats.serverUptime}
          icon={<Server size={20} />}
          tone="success"
        />
        <StatCard
          title="Total Active Users"
          value={stats.totalUsers}
          icon={<Users size={20} />}
          tone="primary"
        />
        <StatCard
          title="Connected Bracelets"
          value={stats.connectedBracelets}
          icon={<Wifi size={20} />}
          tone="primary"
        />
        <StatCard
          title="Packet Routing Metrics"
          sub="SOS signals successfully routed today"
          value={stats.packetMetrics}
          icon={<Activity size={20} />}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, tone = "neutral" }) {
  return (
    <div className={`admin-card ${tone}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div className="admin-card-header">
        <div className="admin-card-title">{title}</div>
        {icon && <div className={`admin-card-icon ${tone}`}>{icon}</div>}
      </div>
      <div className="admin-card-value">{value}</div>
      {sub && <div className="admin-card-sub text-sm muted" style={{ fontSize: '0.8rem', opacity: 0.8 }}>{sub}</div>}
    </div>
  );
}
