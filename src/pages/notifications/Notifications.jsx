import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, BellOff, CheckSquare, Square, CheckCheck, CheckCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useBraceletUsers } from '../../context/BraceletDataProvider';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import logo from '../../assets/logo.png';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Notifications.css';

const SWIPE_THRESHOLD = 60;
const DELETE_WIDTH    = 80;
const LONG_PRESS_MS   = 500;

/* ─────────────────────────────────────────────
   Single swipeable row
   openId / setOpenId are shared across all rows
   selectMode disables swipe and shows checkbox
───────────────────────────────────────────── */
const SwipeableNotif = ({
  item, onDelete, onMarkRead,
  openId, setOpenId,
  selectMode, isChecked, onToggleCheck,
  onNotifTap, onApproveTap,
}) => {
  const startX         = useRef(null);
  const rawDx          = useRef(0);
  const wasOpenOnStart = useRef(false);
  const longPressTimer = useRef(null);
  const didLongPress   = useRef(false);
  const dragging       = useRef(false);
  const wrapperRef     = useRef(null);

  const [liveDelta, setLiveDelta] = useState(null);

  const isSwiped = openId === item.id;

  const displayOffset = liveDelta !== null
    ? wasOpenOnStart.current
        ? Math.min(0, -DELETE_WIDTH + liveDelta)
        : Math.max(-DELETE_WIDTH, Math.min(0, liveDelta))
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

  /* ── Touch handlers (disabled in select mode) ── */
  const handleTouchStart = (e) => {
    if (selectMode) return;
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
    if (selectMode) return;
    const dx = e.touches[0].clientX - startX.current;
    cancelLongPress();
    rawDx.current = dx;
    setLiveDelta(dx);
  };

  const handleTouchEnd = () => {
    if (selectMode) return;
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
  };

  /* ── Mouse handlers (desktop) ── */
  const handleMouseDown = (e) => {
    if (selectMode) return;
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
    if (selectMode) { onToggleCheck(item.id); return; }
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (isSwiped) { closeDelete(); return; }
    // Delegate to page-level handler (marks read + navigates)
    onNotifTap(e, item);
  };

  const offset = selectMode ? 0 : displayOffset;

  const isOpen = isSwiped || liveDelta !== null;

  return (
    <li
      ref={wrapperRef}
      className={`notif-swipe-wrapper ${isOpen ? 'is-open' : ''} ${selectMode ? 'select-mode' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Red Delete reveal layer — hidden in select mode */}
      {!selectMode && (
        <div className="notif-swipe-delete-bg">
          <button
            className="notif-swipe-delete-btn"
            onClick={handleDelete}
            aria-label="Delete notification"
          >
            Delete
          </button>
        </div>
      )}

      {/* Foreground card */}
      <div
        className={`notif-item ${!item.read ? 'unread' : ''} ${isChecked ? 'checked' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleItemClick}
      >
        {/* Checkbox — only visible in select mode */}
        {selectMode && (
          <div className="notif-checkbox" aria-hidden="true">
            {isChecked
              ? <CheckSquare size={20} strokeWidth={2} className="notif-checkbox-icon checked" />
              : <Square      size={20} strokeWidth={1.8} className="notif-checkbox-icon" />
            }
          </div>
        )}

        <div className="notif-icon">
          <img src={item.icon || logo} alt={item.title || 'Notification'} />
        </div>
        <div className="notif-body">
          <p className="notif-title">{item.title}</p>
          <p className="notif-message">{item.message}</p>
          {item.type === 'connection_request' && onApproveTap && (
             <div className="notif-actions" style={{ marginTop: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onApproveTap(e, item); }}
                  style={{ background: 'var(--pm-primary)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  Approve
                </button>
             </div>
          )}
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
  const { notifications, loading, markAsRead, deleteNotification } = useNotifications();
  const { braceletUsers } = useBraceletUsers();
  const [filter, setFilter] = React.useState('all');

  /* Swipe state */
  const [openId, setOpenId] = useState(null);
  const listRef = useRef(null);

  /* Bulk-select state */
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [isBulkDeleteModal, setIsBulkDeleteModal] = useState(false);
  const [isBulkReadModal,   setIsBulkReadModal]   = useState(false);

  /* Success Modal State */
  const [successModalInfo, setSuccessModalInfo] = useState({ open: false, count: 0, message: '' });

  const showSuccessModal = (count, message = '') => {
    setSuccessModalInfo({ open: true, count, message });
    setTimeout(() => {
      setSuccessModalInfo(prev => ({ ...prev, open: false }));
    }, 3000);
  };

  const handleSingleDelete = async (e, id) => {
    try {
      await deleteNotification(e, id);
      showSuccessModal(1);
    } catch (err) {
      console.error('Single delete error:', err);
    }
  };

  const handleApproveConnection = async (e, item) => {
    e.stopPropagation();
    try {
      // 1. Link the bracelet to the requester's appUser doc
      const appUserRef = doc(db, 'appUsers', item.requesterId);
      const appUserSnap = await getDoc(appUserRef);
      
      const ownerRef = doc(db, 'appUsers', item.appUserId);
      const ownerSnap = await getDoc(ownerRef);
      let ownerName = ownerSnap.exists() ? (ownerSnap.data().name || "Unknown") : "Unknown";

      if (appUserSnap.exists()) {
         const updates = {
           linkedBraceletsID: arrayUnion(item.braceletId)
         };
         if (item.nickname) {
           updates[`braceletNicknames.${item.braceletId}`] = item.nickname;
         }
         await updateDoc(appUserRef, updates);
      }
      
      // Spawn approval modal trigger for the requester
      await addDoc(collection(db, 'notifications'), {
        appUserId: item.requesterId,
        type: 'connection_approved_popup',
        ownerName: ownerName,
        braceletId: item.braceletId,
        read: false,
        time: serverTimestamp()
      });

      // 3. Delete notification
      await deleteNotification(e, item.id);
      showSuccessModal(1, "Connection request approved!");

    } catch (err) {
      console.error("Error approving connection:", err);
      alert("Failed to approve connection.");
    }
  };

  /* Click-away: close any open swipe-row when tapping outside the list */
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

  /* Exit select mode and clear selections */
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  /* ── Notification tap: mark read + navigate to map ── */
  const handleNotifTap = useCallback(async (e, item) => {
    // 1. Mark as read in Firestore
    await markAsRead(e, item.id, item.read);

    // 2. Resolve coordinates:
    //    a) Live position from braceletUsers (most current)
    //    b) Stored coords field on the notification (snapshot at alert time)
    let focusCoords = null;
    if (item.braceletUserId) {
      const liveUser = braceletUsers.find(u => u.id === item.braceletUserId);
      if (liveUser?.position) {
        focusCoords = liveUser.position; // already [lat, lng]
      }
    }
    if (!focusCoords && item.coords) {
      focusCoords = [item.coords.lat, item.coords.lng];
    }

    // 3. Navigate to Places, passing coords via router state
    navigate('/app/places', {
      state: focusCoords
        ? { focusCoords, focusUserId: item.braceletUserId ?? null }
        : null,
    });
  }, [markAsRead, braceletUsers, navigate]);

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'read') return item.read;
    if (filter === 'unread') return !item.read;
    return true;
  });

  const allVisibleIds = filteredNotifications.map(n => n.id);
  const allSelected   = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const someSelected  = selected.size > 0;

  const handleToggleCheck = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allVisibleIds));
    }
  };

  /* Bulk delete */
  const handleBulkDelete = async () => {
    try {
      const count = selected.size;
      await Promise.all([...selected].map(id => deleteNotification({ stopPropagation: () => {} }, id)));
      setIsBulkDeleteModal(false);
      exitSelectMode();
      showSuccessModal(count);
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Failed to delete selected notifications.');
    }
  };

  /* Bulk mark-as-read */
  const handleBulkMarkRead = async () => {
    try {
      const unread = [...selected].filter(id => {
        const n = notifications.find(n => n.id === id);
        return n && !n.read;
      });
      await Promise.all(unread.map(id => markAsRead({ stopPropagation: () => {} }, id, false)));
      setIsBulkReadModal(false);
      exitSelectMode();
    } catch (err) {
      console.error('Bulk mark-read error:', err);
      alert('Failed to mark notifications as read.');
    }
  };

  return (
    <div className="br-page">
      <header className="br-navbar">
        <button className="br-nav-back" onClick={selectMode ? exitSelectMode : () => navigate(-1)}>
          <ChevronLeft size={24} color="#444" />
        </button>
        <h1 className="br-nav-title">
          {selectMode ? (selected.size > 0 ? `${selected.size} Selected` : 'Select') : 'Notifications'}
        </h1>

        {selectMode ? (
          <button className="br-nav-cancel" onClick={exitSelectMode}>Cancel</button>
        ) : (
          <button
            className="br-nav-select"
            onClick={() => { setSelectMode(true); setOpenId(null); }}
            disabled={notifications.length === 0}
          >
            Select
          </button>
        )}
      </header>

      <div className="notif-horizontal-nav-container">
        <div className="notif-horizontal-nav">
          {['all', 'unread', 'read'].map((tab) => (
            <button
              key={tab}
              className={`notif-tab-btn ${filter === tab ? 'active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Select-All bar — only shown in select mode */}
        {selectMode && filteredNotifications.length > 0 && (
          <div className="notif-select-all-bar">
            <button className="notif-select-all-btn" onClick={handleSelectAll}>
              <span className="notif-select-all-icon">
                {allSelected
                  ? <CheckSquare size={18} strokeWidth={2} />
                  : <Square      size={18} strokeWidth={1.8} />
                }
              </span>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="notif-select-count">
              {selected.size} of {filteredNotifications.length}
            </span>
          </div>
        )}
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
                onDelete={handleSingleDelete}
                onMarkRead={markAsRead}
                openId={openId}
                setOpenId={setOpenId}
                selectMode={selectMode}
                isChecked={selected.has(item.id)}
                onToggleCheck={handleToggleCheck}
                onNotifTap={handleNotifTap}
                onApproveTap={handleApproveConnection}
              />
            ))}
          </ul>
        )}
      </main>

      {/* Bottom action bar — slides up in select mode */}
      {selectMode && (
        <div className={`notif-bulk-bar ${someSelected ? 'active' : ''}`}>
          <button
            className="notif-bulk-btn read"
            onClick={() => someSelected && setIsBulkReadModal(true)}
            disabled={!someSelected}
          >
            <CheckCheck size={18} strokeWidth={2} />
            Mark as Read
          </button>
          <div className="notif-bulk-divider" />
          <button
            className="notif-bulk-btn delete"
            onClick={() => someSelected && setIsBulkDeleteModal(true)}
            disabled={!someSelected}
          >
            <Trash2 size={18} strokeWidth={2} />
            Delete
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModal && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal-content">
            <div className="notif-modal-icon">
              <Trash2 size={32} />
            </div>
            <h3>Delete {selected.size} Notification{selected.size > 1 ? 's' : ''}?</h3>
            <p>This will permanently remove the selected notifications. This action cannot be undone.</p>
            <div className="notif-modal-actions">
              <button className="notif-modal-btn cancel" onClick={() => setIsBulkDeleteModal(false)}>Cancel</button>
              <button className="notif-modal-btn confirm" onClick={handleBulkDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Mark-as-Read Confirmation Modal */}
      {isBulkReadModal && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal-content">
            <div className="notif-modal-icon" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--pm-text)' }}>
              <CheckCheck size={32} />
            </div>
            <h3>Mark as Read?</h3>
            <p>Mark {selected.size} selected notification{selected.size > 1 ? 's' : ''} as read?</p>
            <div className="notif-modal-actions">
              <button className="notif-modal-btn cancel" onClick={() => setIsBulkReadModal(false)}>Cancel</button>
              <button className="notif-modal-btn confirm" onClick={handleBulkMarkRead}>Mark as Read</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModalInfo.open && (
        <div className="notif-modal-backdrop" onClick={() => setSuccessModalInfo({ open: false, count: 0 })}>
          <div className="notif-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-success-icon">
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <p>
              {successModalInfo.message 
                ? successModalInfo.message 
                : successModalInfo.count === 1
                ? 'Notification successfully deleted'
                : `${successModalInfo.count} notifications successfully deleted`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
