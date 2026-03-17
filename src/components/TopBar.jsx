import { useLocation, useNavigate } from "react-router-dom";
import "./TopBar.css";
import { Bell, ChevronLeft } from "lucide-react";
import avatar from "../assets/red.webp";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const TopBar = ({ onProfileClick }) => {
  const { currentUser } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/app" || path === "/app/home") return "Home";
    if (path.includes("/app/people")) return "People";
    if (path.includes("/app/places")) return "Places";
    if (path.includes("/app/report/")) return "Incident Report";
    if (path.includes("/app/report")) return "Report";
    if (path.includes("/app/myBracelet")) return "My Bracelet";
    if (path.includes("/app/account")) return "Account Settings";
    if (path.includes("/app/help")) return "Help Articles";
    if (path.includes("/app/about")) return "About PingMe";
    if (path.includes("/app/userProfile")) return "User Profile";
    return "";
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {location.pathname.includes('/app/userProfile') || location.pathname.includes('/app/report/') ? (
          <button className="topbar-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={28} className="topbar-back-icon" />
          </button>
        ) : (
          <>
            <button className="topbar-mobile-menu-btn" onClick={onProfileClick}>
              <img src={currentUser?.photoURL || avatar} alt="Profile" />
            </button>
            {/* Spacer to maintain balance on desktop after logo removal */}
            <div className="topbar-spacer-desktop"></div>
          </>
        )}
      </div>

      {/* Center: Dynamic Title */}
      <div className="topbar-title-container">
        <h2 className="topbar-page-title">{getPageTitle()}</h2>
      </div>

      {/* Right: Actions */}
      <div className="topbar-actions">
        <button
          className="topbar-icon-btn"
          onClick={() => navigate('/app/notifications')}
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>

        <button
          className="topbar-desktop-profile-btn"
          onClick={onProfileClick}
        >
          <img src={currentUser?.photoURL || avatar} alt="Profile" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
