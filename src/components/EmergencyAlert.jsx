// src/components/EmergencyAlert.jsx
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShieldAlert, MapPin } from 'lucide-react';
import { useEmergencyAlert } from '../context/EmergencyAlertContext';
import { useBraceletUsers } from '../context/BraceletDataProvider';
import './EmergencyAlert.css';

// Derive a 1–3 priority level from the SOS payload.
function getSosLevel(sosValue) {
  if (sosValue && typeof sosValue === 'object') {
    const lvl = Number(sosValue.level ?? sosValue.priority);
    if (lvl >= 1 && lvl <= 3) return lvl;
  }
  return 1;
}

const LEVEL_LABEL = { 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' };

function AlertCard({ user, onDismiss, onViewLocation }) {
  const level = getSosLevel(user.sos);

  return (
    <div
      className="ea-card"
      role="alertdialog"
      aria-modal="true"
      aria-label={`Emergency alert for ${user.name}`}
    >
      {/* Double pulse rings for depth */}
      <div className="ea-pulse-ring"   aria-hidden="true" />
      <div className="ea-pulse-ring-2" aria-hidden="true" />

      {/* ── Header ── */}
      <div className="ea-card-header">
        <div className="ea-header-title">
          <ShieldAlert size={15} strokeWidth={2.5} className="ea-header-icon" />
          <span>Emergency alert</span>
        </div>
        <button
          id={`ea-close-${user.id}`}
          className="ea-close"
          onClick={() => onDismiss(user.id)}
          aria-label={`Dismiss alert for ${user.name}`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Thin gradient rule */}
      <div className="ea-divider" />

      {/* ── Avatar — centered with halo ── */}
      <div className="ea-avatar-wrap">
        <div className="ea-avatar-halo" aria-hidden="true" />
        <img className="ea-avatar" src={user.avatar} alt={user.name} />
        <span className="ea-avatar-icon" aria-hidden="true">
          <ShieldAlert size={13} strokeWidth={2.5} />
        </span>
      </div>

      {/* ── Message ── */}
      <p className="ea-message">
        <span className="ea-message-name">{user.name}</span>
        {' '}needs help!
      </p>

      {/* Priority badge */}
      <div style={{ textAlign: 'center', marginBottom: '2px' }}>
        <span className="ea-priority-badge">
          Priority · Emergency {LEVEL_LABEL[level]}
        </span>
      </div>

      {/* Short separator line */}
      <div className="ea-sep" />

      {/* ── View Location ── */}
      <button
        className="ea-btn-primary"
        onClick={() => onViewLocation(user)}
      >
        <MapPin size={16} strokeWidth={2.5} />
        View Location
      </button>
    </div>
  );
}

export default function EmergencyAlert({ addressCache }) {
  const { activeAlerts, dismissAlert } = useEmergencyAlert();
  const { setMapViewState } = useBraceletUsers();
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  // Navigate to home map and fly to the SOS user's position
  const handleViewLocation = useCallback((user) => {
    if (user.position && Array.isArray(user.position)) {
      setMapViewState({ center: user.position, zoom: 18 });
    }
    dismissAlert(user.id);
    navigate('/app');
  }, [setMapViewState, dismissAlert, navigate]);

  // Focus trap
  useEffect(() => {
    if (activeAlerts.length > 0 && overlayRef.current) {
      const first = overlayRef.current.querySelector(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }
  }, [activeAlerts.length]);

  // ESC dismisses current alert
  useEffect(() => {
    if (!activeAlerts.length) return;
    const onKey = (e) => { if (e.key === 'Escape') dismissAlert(activeAlerts[0].id); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeAlerts, dismissAlert]);

  if (!activeAlerts.length) return null;

  const current = activeAlerts[0];
  const total   = activeAlerts.length;

  return (
    <div ref={overlayRef} className="ea-overlay" role="presentation">
      <div className="ea-backdrop" aria-hidden="true" />

      <div className="ea-center">
        {total > 1 && (
          <div className="ea-counter" aria-live="polite">
            ⚠️ {total} active emergencies — showing 1 of {total}
          </div>
        )}
        <AlertCard
          key={current.id}
          user={current}
          addressCache={addressCache}
          onDismiss={dismissAlert}
          onViewLocation={handleViewLocation}
        />
      </div>
    </div>
  );
}
