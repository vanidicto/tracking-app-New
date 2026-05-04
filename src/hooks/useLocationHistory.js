// src/hooks/useLocationHistory.js
import { useState, useEffect } from 'react';
import { db } from '../config/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

/**
 * @hook useLocationHistory
 * @description Subscribes in real-time to the last N location history entries
 * for a given bracelet. Returns entries sorted most-recent-first so the list
 * always shows the newest stop at the top.
 *
 * Lazy-safe: pass `null` as braceletId to skip the subscription entirely
 * (e.g. when the History tab is not active).
 *
 * @param {string|null} braceletId  - Bracelet document ID, or null to skip.
 * @param {number} [maxEntries=20]  - Max entries to fetch (matches MAX_HISTORY in service).
 *
 * @returns {{ history: Array<HistoryEntry>, loading: boolean }}
 *
 * @example
 * const { history, loading } = useLocationHistory(person.id);
 * // history[0] = most recent entry
 * // history[0].timestampDate = JS Date object (null if Firestore pending write)
 */
export function useLocationHistory(braceletId, maxEntries = 20) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lazy skip — only subscribe when we actually need the data
        if (!braceletId) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const histRef = collection(db, 'deviceStatus', braceletId, 'locationHistory');
        const q = query(histRef, orderBy('timestamp', 'desc'), limit(maxEntries));

        const unsub = onSnapshot(q, (snap) => {
            const entries = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    lat: data.lat,
                    lng: data.lng,
                    battery: data.battery,
                    online: data.online,
                    // Convert Firestore Timestamp → JS Date for display (null on pending server writes)
                    timestampDate: data.timestamp?.toDate?.() ?? null,
                };
            });
            setHistory(entries); // Most-recent-first
            setLoading(false);
        }, (err) => {
            console.error('useLocationHistory onSnapshot error:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [braceletId, maxEntries]);

    return { history, loading };
}
