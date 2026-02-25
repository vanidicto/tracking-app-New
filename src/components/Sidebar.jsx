// src/components/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Map, FileText } from 'lucide-react';
import './Sidebar.css';
import logo from '../assets/logo.png';

/**
 * SidebarLink with FULL manual active-state control
 */
const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const path = location.pathname;

  let isActive = false;

  // --- ACTIVE LOGIC ---
  if (to === '/app') {
    // Home should ONLY be active on exact /app
    isActive = path === '/app';
  } else if (to === '/app/people') {
    // People is active on:
    // /app/people
    // /app/userProfile/:id
    isActive =
      path.startsWith('/app/people') ||
      path.startsWith('/app/userProfile');
  } else {
    // Other pages (Places, Report)
    isActive = path.startsWith(to);
  }

  return (
    <Link to={to} className={`sidebar-link ${isActive ? 'active' : ''}`}>
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
};

function Sidebar() {
  return (
    <nav className="app-sidebar">
      <div className="sidebar-header">
        <Link to="/app">
          <img src={logo} alt="PingMe Logo" className="sidebar-logo" />
        </Link>
      </div>

      <div className="sidebar-links">
        <SidebarLink to="/app" icon={Home} label="Home" />
        <SidebarLink to="/app/people" icon={Users} label="People" />
        <SidebarLink to="/app/places" icon={Map} label="Places" />
        <SidebarLink to="/app/report" icon={FileText} label="Report" />
      </div>
    </nav>
  );
}

export default Sidebar;
