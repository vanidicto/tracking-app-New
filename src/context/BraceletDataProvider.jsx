// src/context/BraceletDataProvider.jsx
// Thin context that calls useBraceletData() ONCE and shares the result
// with all child pages. Eliminates duplicate Firestore listeners.
// Also holds a shared addressCache so reverse geocoding only happens once globally.
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useBraceletData, useSosReportGenerator } from '../hooks/useBraceletData';
import { reverseGeocode } from '../utils/geocode';

const BraceletDataContext = createContext(null);

export function BraceletDataProvider({ children }) {
  const data = useBraceletData();

  // Run the SOS report generator once at the layout level
  useSosReportGenerator(data.braceletUsers);

  // ---- Centralized address cache ----
  // Only ONE set of reverse-geocoding requests runs for the entire app.
  const [addressCache, setAddressCache] = useState({});
  const fetchedIds = useRef(new Set());

  useEffect(() => {
    let active = true;

    async function run() {
      for (const u of data.braceletUsers) {
        if (!active) break;
        if (!u?.position) continue;
        if (fetchedIds.current.has(u.id)) continue;

        const [lat, lng] = u.position;
        if (isNaN(lat) || isNaN(lng)) continue;
        if (lat === 0 && lng === 0) continue;

        fetchedIds.current.add(u.id);
        setAddressCache((prev) => ({ ...prev, [u.id]: 'Fetching location…' }));

        const addr = await reverseGeocode(lat, lng);

        setAddressCache((prev) => ({
          ...prev,
          [u.id]: addr || 'Address not found',
        }));
      }
    }

    run();
    return () => { active = false; };
  }, [data.braceletUsers]);

  // Allow individual pages (like UserProfile) to request a geocode for a specific position
  const fetchAddress = useCallback(async (userId, lat, lng) => {
    if (fetchedIds.current.has(userId)) return;
    fetchedIds.current.add(userId);
    setAddressCache((prev) => ({ ...prev, [userId]: 'Fetching location…' }));
    const addr = await reverseGeocode(lat, lng);
    setAddressCache((prev) => ({ ...prev, [userId]: addr || 'Address not found' }));
  }, []);

  const [mapViewState, setMapViewState] = useState(null);

  return (
    <BraceletDataContext.Provider value={{ ...data, addressCache, fetchAddress, mapViewState, setMapViewState }}>
      {children}
    </BraceletDataContext.Provider>
  );
}

export function useBraceletUsers() {
  const ctx = useContext(BraceletDataContext);
  if (!ctx) {
    throw new Error('useBraceletUsers must be used inside BraceletDataProvider');
  }
  return ctx;
}
