import { useState, useEffect } from "react";
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
        {/* Mobile menu (sidebar/profile) */}
        <button
          className="topbar-mobile-menu-btn"
          onClick={onProfileClick}
        >
          <Menu size={26} />
        </button>

        {/* Center placeholder (keeps spacing consistent) */}
        <div className="topbar-spacer" />

        {/* Actions */}
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
