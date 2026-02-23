// src/components/Sidebar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Map, FileText, LogOut } from 'lucide-react';
import './Sidebar.css';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

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
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

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

      <div className="sidebar-footer">
        <button className="sidebar-link logout-button" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
