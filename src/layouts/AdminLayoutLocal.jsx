import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Cpu, MapPinned, LogOut } from "lucide-react";
import "../styles/admin.css";
import "./AdminLayout.css";
import logo from "../assets/logo.png"; // Import Logo

const KEY = "pm_admin_authed";

export default function AdminLayoutLocal() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(KEY);
    navigate("/admin-login");
  };

  return (
    <div className="pm-admin admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logo} alt="PingMe Admin" className="admin-brand-logo-img" />
          <div>
            <div className="admin-brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="admin-nav">
          <AdminLink to="/admin" icon={LayoutDashboard} label="Dashboard" end />
          <AdminLink to="/admin/users" icon={Users} label="User Management" />
          <AdminLink to="/admin/devices" icon={Cpu} label="Device Management" />
          <AdminLink to="/admin/monitor" icon={MapPinned} label="Global Monitoring" />
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout" onClick={handleLogout} type="button">
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="admin-topbar-title">Back Office</div>
            <div className="admin-topbar-sub">Mock Mode (no Firebase)</div>
          </div>

          <div className="admin-topbar-right">
            <button className="admin-btn admin-btn-ghost" type="button" onClick={() => navigate("/")}>
              Go to Landing
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminLink({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `admin-link ${isActive ? "active" : ""}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}
