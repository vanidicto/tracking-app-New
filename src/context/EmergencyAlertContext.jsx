// src/context/EmergencyAlertContext.jsx
// Consumes BraceletDataProvider and surfaces any active SOS users as persistent alerts.
// Alerts survive navigation (mounted in AppLayout) and must be manually dismissed per user.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useBraceletUsers } from './BraceletDataProvider';

const EmergencyAlertContext = createContext(null);

export function EmergencyAlertProvider({ children }) {
  const { braceletUsers } = useBraceletUsers();

  // Set of bracelet IDs the user has manually dismissed for THIS sos session.
  // We clear a dismissal when the user's SOS goes inactive (so it fires again next time).
  const [dismissed, setDismissed] = useState(new Set());

  // Track previous sos states so we can re-enable dismissed alerts when sos resets
  const prevSosRef = useRef(new Map()); // braceletId → boolean

  useEffect(() => {
    if (!braceletUsers?.length) return;

    braceletUsers.forEach((user) => {
      const prevSos = prevSosRef.current.get(user.id);
      const curSos = !!user.sos;

      // If SOS went OFF, clear the dismissal so the alert fires again next emergency
      if (prevSos === true && curSos === false) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
      }

      prevSosRef.current.set(user.id, curSos);
    });
  }, [braceletUsers]);

  // Compute which SOS users are currently active and not dismissed
  const activeAlerts = (braceletUsers || []).filter(
    (u) => u.sos && !dismissed.has(u.id)
  );

  const dismissAlert = (braceletId) => {
    setDismissed((prev) => new Set([...prev, braceletId]));
  };

  return (
    <EmergencyAlertContext.Provider value={{ activeAlerts, dismissAlert }}>
      {children}
    </EmergencyAlertContext.Provider>
  );
}

export function useEmergencyAlert() {
  const ctx = useContext(EmergencyAlertContext);
  if (!ctx) throw new Error('useEmergencyAlert must be used inside EmergencyAlertProvider');
  return ctx;
}
