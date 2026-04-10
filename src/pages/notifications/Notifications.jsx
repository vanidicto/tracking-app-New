import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, BellOff } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import logo from '../../assets/logo.png';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Notifications.css';

const SWIPE_THRESHOLD = 60;
const DELETE_WIDTH    = 80;
const LONG_PRESS_MS   = 500;

/* ─────────────────────────────────────────────
   Single swipeable row
   openId / setOpenId are shared across all rows
───────────────────────────────────────────── */
const SwipeableNotif = ({ item, onDelete, onMarkRead, openId, setOpenId }) => {
  const startX         = useRef(null);
  const rawDx          = useRef(0);          // raw delta during current drag
  const wasOpenOnStart = useRef(false);      // was Delete visible when gesture began?
  const longPressTimer = useRef(null);
  const didLongPress   = useRef(false);
  const dragging       = useRef(false);
  const wrapperRef     = useRef(null);

  const [liveDelta, setLiveDelta] = useState(null); // null = not dragging

  const isSwiped = openId === item.id;

  /* Compute displayed offset:
     - During drag   → clamped live position
     - At rest open  → -DELETE_WIDTH
     - At rest closed → 0                                        */
  const displayOffset = liveDelta !== null
    ? wasOpenOnStart.current
        ? Math.min(0, -DELETE_WIDTH + liveDelta)   // rightward swipe to dismiss
        : Math.max(-DELETE_WIDTH, Math.min(0, liveDelta)) // leftward swipe to open
    : isSwiped ? -DELETE_WIDTH : 0;

  const openDelete = useCallback(() => {
    didLongPress.current = true;
    setOpenId(item.id);
    setLiveDelta(null);
  }, [item.id, setOpenId]);

  const closeDelete = useCallback(() => {
    setOpenId(null);
  }, [setOpenId]);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /* ── Touch handlers ── */
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    rawDx.current  = 0;
    wasOpenOnStart.current = openId === item.id;
    didLongPress.current   = false;
    setLiveDelta(0);
    if (!wasOpenOnStart.current) {
      longPressTimer.current = setTimeout(openDelete, LONG_PRESS_MS);
    }
  };

  const handleTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current;
    cancelLongPress();
    rawDx.current = dx;
    setLiveDelta(dx);
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    setLiveDelta(null);
    if (didLongPress.current) { rawDx.current = 0; return; }
    const dx = rawDx.current;
    rawDx.current = 0;
    if (wasOpenOnStart.current) {
      // Rightward swipe dismisses
      if (dx >= SWIPE_THRESHOLD) closeDelete();
      // else stays open
    } else {
      if (dx <= -SWIPE_THRESHOLD) setOpenId(item.id);
      // else stays closed
    }
  };

  /* ── Mouse handlers (desktop) ── */
  const handleMouseDown = (e) => {
    dragging.current = true;
    didLongPress.current = false;
    startX.current = e.clientX;
    rawDx.current  = 0;
    wasOpenOnStart.current = openId === item.id;
    setLiveDelta(0);
    if (!wasOpenOnStart.current) {
      longPressTimer.current = setTimeout(openDelete, LONG_PRESS_MS);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    cancelLongPress();
    const dx = e.clientX - startX.current;
    rawDx.current = dx;
    setLiveDelta(dx);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    cancelLongPress();
    setLiveDelta(null);
    if (didLongPress.current) { rawDx.current = 0; return; }
    const dx = rawDx.current;
    rawDx.current = 0;
    if (wasOpenOnStart.current) {
      if (dx >= SWIPE_THRESHOLD) closeDelete();
    } else {
      if (dx <= -SWIPE_THRESHOLD) setOpenId(item.id);
    }
  }, [closeDelete, item.id, setOpenId]);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(e, item.id);
  };

  const handleItemClick = (e) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (isSwiped) { closeDelete(); return; }
    onMarkRead(e, item.id, item.read);
  };

  const offset = displayOffset;

  return (
    <li
      ref={wrapperRef}
      className="notif-swipe-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Red Delete reveal layer */}
      <div className="notif-swipe-delete-bg">
        <button
          className="notif-swipe-delete-btn"
          onClick={handleDelete}
          aria-label="Delete notification"
        >
          Delete
        </button>
      </div>

      {/* Foreground card */}
      <div
        className={`notif-item ${!item.read ? 'unread' : ''} snap-back`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleItemClick}
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
        </div>
      </div>
    </li>
  );
};

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const [filter, setFilter]       = React.useState('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  /* Shared open-row state — null means nothing is open */
  const [openId, setOpenId] = useState(null);
  const listRef = useRef(null);

  /* Click-away: close the open row when the user taps outside the list */
  useEffect(() => {
    const handleDocPointerDown = (e) => {
      if (openId === null) return;
      if (listRef.current && !listRef.current.contains(e.target)) {
        setOpenId(null);
      }
    };
    document.addEventListener('pointerdown', handleDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocPointerDown, true);
  }, [openId]);

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
          <ul className="notif-list" ref={listRef}>
            {filteredNotifications.map((item) => (
              <SwipeableNotif
                key={item.id}
                item={item}
                onDelete={deleteNotification}
                onMarkRead={markAsRead}
                openId={openId}
                setOpenId={setOpenId}
              />
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
