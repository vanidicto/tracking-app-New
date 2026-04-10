import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronLeft, ChevronRight, User, ShieldCheck } from "lucide-react";
import avatar from "../../assets/red.webp";
import "../../styles/MenuLayout.css";
import "./AccountMenu.css";

export default function AccountMenu() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/app", { state: { openProfile: true } });
  };

  const displayName =
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "User");

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={handleBack}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Account</h1>
        <div className="br-nav-spacer"></div>
      </header>

      <main className="br-main acm-main">
        {/* User identity card at top */}
        <div className="acm-identity">
          <img
            src={currentUser?.photoURL || avatar}
            alt="Avatar"
            className="acm-avatar"
          />
          <div className="acm-identity-text">
            <p className="acm-identity-name">{displayName}</p>
            <p className="acm-identity-email">{currentUser?.email || "—"}</p>
          </div>
        </div>

        {/* Sub-menu options */}
        <nav className="acm-menu">
          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/account/info")}
          >
            <div className="acm-menu-icon-wrap acm-icon-info">
              <User size={22} />
            </div>
            <div className="acm-menu-text">
              <span className="acm-menu-label">Account Information</span>
              <span className="acm-menu-desc">
                Update your name, email and profile photo
              </span>
            </div>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>

          <button
            className="acm-menu-item"
            onClick={() => navigate("/app/account/security")}
          >
            <div className="acm-menu-icon-wrap acm-icon-security">
              <ShieldCheck size={22} />
            </div>
            <div className="acm-menu-text">
              <span className="acm-menu-label">Security &amp; Password</span>
              <span className="acm-menu-desc">
                Manage your password and linked accounts
              </span>
            </div>
            <ChevronRight size={18} className="acm-menu-arrow" />
          </button>
        </nav>
      </main>
    </div>
  );
}
