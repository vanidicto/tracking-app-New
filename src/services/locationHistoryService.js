// src/services/locationHistoryService.js
import { db } from '../config/firebaseConfig';
import {
    collection, addDoc, getDocs, deleteDoc,
    query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';

/**
 * Maximum number of location history entries to retain per bracelet.
 * When the cap is reached, the oldest entry is deleted before a new one is written.
 * 20 entries provides a useful "last hour or so" of movement without unbounded storage growth.
 */
const MAX_HISTORY = 20;

/**
 * @function recordLocationHistory
 * @description Writes a new GPS coordinate snapshot to the bracelet's
 * `locationHistory` subcollection inside `deviceStatus`. Automatically prunes
 * the oldest entry when the collection reaches MAX_HISTORY documents.
 *
 * Collection path: deviceStatus/{braceletId}/locationHistory/{autoId}
 *
 * @param {string} braceletId   - The bracelet's Firestore document ID (e.g. "PM-2023-001")
 * @param {number} lat          - Latitude
 * @param {number} lng          - Longitude
 * @param {Object} [extras={}]  - Optional snapshot metadata
 * @param {number} [extras.battery] - Battery % at the time of this recording
 * @param {boolean} [extras.online] - Online status at the time of this recording
 */
export async function recordLocationHistory(braceletId, lat, lng, extras = {}) {
    if (!braceletId || lat == null || lng == null) return;
    if (isNaN(lat) || isNaN(lng)) return;

    const histRef = collection(db, 'deviceStatus', braceletId, 'locationHistory');

    // Fetch existing entries sorted oldest-first so we can prune the earliest
    const existingQ = query(histRef, orderBy('timestamp', 'asc'));
    const existingSnap = await getDocs(existingQ);

    if (existingSnap.size >= MAX_HISTORY) {
        // Delete the OLDEST entry (first in ascending timestamp order)
        await deleteDoc(existingSnap.docs[0].ref);
    }

    await addDoc(histRef, {
        lat,
        lng,
        timestamp: serverTimestamp(),
        battery: extras.battery ?? null,
        online: extras.online ?? null,
    });
}
