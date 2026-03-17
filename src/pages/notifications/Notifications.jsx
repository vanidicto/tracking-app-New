import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, BellOff } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import logo from '../../assets/logo.png';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, deleteNotification } = useNotifications();

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Notifications</h1>
        <div className="br-nav-spacer"></div>
      </header>

      <main className="br-main notif-main">
        {loading ? (
          <div className="notif-loading">
            <LoadingSpinner message="Loading updates..." />
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <BellOff size={56} strokeWidth={1.2} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="notif-list">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={`notif-item ${!item.read ? 'unread' : ''}`}
                onClick={(e) => markAsRead(e, item.id, item.read)}
              >
                <div className="notif-icon">
                  <img src={item.icon || logo} alt={item.title || 'Notification'} />
                </div>
                <div className="notif-body">
                  <p className="notif-title">{item.title}</p>
                  <p className="notif-message">{item.message}</p>
                </div>
                <div className="notif-meta">
                  <span className="notif-time">
                    {item.time
                      ? item.time.toDate
                        ? item.time.toDate().toLocaleString()
                        : item.time
                      : ''}
                  </span>
                  <button
                    className="notif-delete-btn"
                    onClick={(e) => deleteNotification(e, item.id)}
                    aria-label="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Notifications;
