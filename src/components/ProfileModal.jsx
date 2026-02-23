import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProfileModal.css";
import logo from "../assets/logo.png";
import avatar from "../assets/red.webp";
import { X, User, Shield, Phone, Lock, HelpCircle, Info, Moon, LogOut } from "lucide-react";

const menuItems = [
  { icon: User, label: "Account", to: "/app/account" },
  { icon: Shield, label: "My Room", to: "/app/my-room" },
  { icon: Lock, label: "Privacy & Security", to: "/app/privacy" },
  { icon: HelpCircle, label: "Help Articles", to: "/app/help" },
  { icon: Phone, label: "Chat with Support", to: "/app/support" },
  { icon: Info, label: "About", to: "/app/about" },
  { icon: Moon, label: "Dark mode", toggle: true },
];

const DARK_KEY = "pm_dark_mode";

export default function ProfileModal({ isOpen, onClose }) {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = React.useState(false);

  // Load persisted dark mode
  React.useEffect(() => {
    const saved = localStorage.getItem(DARK_KEY);
    const enabled = saved === "1";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("pm-dark", enabled);
  }, []);

  // Apply dark mode changes
  React.useEffect(() => {
    document.documentElement.classList.toggle("pm-dark", darkMode);
    localStorage.setItem(DARK_KEY, darkMode ? "1" : "0");
  }, [darkMode]);

  // Prevent body scroll when modal open
  React.useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");

    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // Close on ESC
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleNavigate = (to) => {
    onClose();
    navigate(to);
  };

  const handleContentClick = (e) => e.stopPropagation();

  const displayName =
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "User");

  return (
    <div
      className={`profile-modal-backdrop ${isOpen ? "open" : ""}`}
      onClick={onClose}
    >
      <div
        className={`profile-modal-content ${isOpen ? "open" : ""}`}
        onClick={handleContentClick}
      >
        <div className="profile-modal-header">
          <img src={logo} alt="PingMe Logo" className="modal-header-logo" />
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={26} />
          </button>
        </div>

        <div className="profile-modal-user">
          <img src={avatar} alt="User Avatar" className="profile-modal-avatar" />
          <h2 className="profile-modal-name">{displayName}</h2>
          <p className="profile-modal-email">{currentUser?.email || "—"}</p>
        </div>

        <nav className="profile-modal-menu">
          {menuItems.map((item, index) => {
            // Toggle row (Dark Mode)
            if (item.toggle) {
              return (
                <button
                  key={index}
                  type="button"
                  className="profile-menu-item"
                  onClick={() => setDarkMode((v) => !v)}
                >
                  <item.icon size={22} className="profile-menu-icon" />
                  <span className="profile-menu-label">{item.label}</span>

                  <div className={`toggle-switch profile-menu-toggle ${darkMode ? "active" : ""}`}>
                    <div className="toggle-knob"></div>
                  </div>
                </button>
              );
            }

            // Navigation row
            return (
              <button
                key={index}
                type="button"
                className="profile-menu-item"
                onClick={() => handleNavigate(item.to)}
              >
                <item.icon size={22} className="profile-menu-icon" />
                <span className="profile-menu-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="profile-modal-footer">
          <button onClick={handleLogout} className="profile-menu-item profile-logout-btn">
            <LogOut size={22} className="profile-menu-icon" style={{ color: 'inherit' }} />
            <span className="profile-menu-label">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
