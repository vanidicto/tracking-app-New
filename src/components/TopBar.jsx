import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./TopBar.css";
import { Bell, Menu } from "lucide-react";
import avatar from "../assets/red.webp";
import NotificationModal from "./NotificationModal";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const TopBar = ({ onProfileClick }) => {
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  console.log("TopBar rendered for path:", location.pathname);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/app" || path === "/app/home") return "Home";
    if (path.includes("/app/people")) return "People";
    if (path.includes("/app/places")) return "Places";
    if (path.includes("/app/report")) return "Report";
    if (path.includes("/app/myBracelet")) return "My Bracelet";
    if (path.includes("/app/account")) return "Account Settings";
    if (path.includes("/app/help")) return "Help Articles";
    if (path.includes("/app/about")) return "About PingMe";
    if (path.includes("/app/userProfile")) return "User Profile";
    return "";
  };

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("appUserId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const ta = a.time?.seconds ?? a.time ?? 0;
          const tb = b.time?.seconds ?? b.time ?? 0;
          return tb - ta;
        });

        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error("Notifications listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const markAsRead = async (e, id, alreadyRead) => {
    e.stopPropagation();
    if (alreadyRead) return;
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="app-topbar">
        <div className="topbar-left">
          <button className="topbar-mobile-menu-btn" onClick={onProfileClick}>
            <Menu size={24} />
          </button>
          {/* Spacer to maintain balance on desktop after logo removal */}
          <div className="topbar-spacer-desktop"></div>
        </div>

        {/* Center: Dynamic Title */}
        <div className="topbar-title-container">
          <h2 className="topbar-page-title">{getPageTitle()}</h2>
        </div>

        {/* Right: Actions */}
        <div className="topbar-actions">
          <button
            className="topbar-icon-btn"
            onClick={() => setIsNotificationsModalOpen(true)}
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
            <img src={avatar} alt="Profile" />
          </button>
        </div>
      </header>

      <NotificationModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        loading={loading}
        onMarkAsRead={markAsRead}
        onDeleteNotification={deleteNotification}
      />
    </>
  );
};

export default TopBar;
