import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, BellOff } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import logo from '../../assets/logo.png';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const [filter, setFilter] = React.useState('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'read') return item.read;
    if (filter === 'unread') return !item.read;
    return true;
  });

  const handleClearAll = async () => {
    try {
      await deleteAllNotifications();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Clear all error:", err);
      alert("Failed to clear notifications.");
    }
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">Notifications</h1>
        <button 
          className="br-nav-clear-all" 
          onClick={() => setIsModalOpen(true)}
          disabled={notifications.length === 0}
        >
          Clear All
        </button>
      </header>

      <div className="notif-horizontal-nav-container">
        <div className="notif-horizontal-nav">
          {['all', 'unread', 'read'].map((tab) => (
            <button
              key={tab}
              className={`notif-tab-btn ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="br-main notif-main">
        {loading ? (
          <div className="notif-loading">
            <LoadingSpinner message="Loading updates..." />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty">
            <BellOff size={56} strokeWidth={1.2} />
            <p>{filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}</p>
          </div>
        ) : (
          <ul className="notif-list">
            {filteredNotifications.map((item) => (
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

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal-content">
            <div className="notif-modal-icon">
              <Trash2 size={32} />
            </div>
            <h3>Clear Notifications?</h3>
            <p>Are you sure you want to permanently delete all notifications? This action cannot be undone.</p>
            <div className="notif-modal-actions">
              <button className="notif-modal-btn cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="notif-modal-btn confirm" onClick={handleClearAll}>Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
