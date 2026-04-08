/**
 * @file useBraceletData.js
 * @summary Core data sync hook that manages the complex relationship between appUsers, their linked bracelets,
 * and the real-time status of those devices. It acts as the central data engine for the tracking system.
 * 
 * FLOW SUMMARY:
 * 1. TanStack Query fetches the initial list of linked bracelets for the authenticated user.
 * 2. Two real-time Firestore listeners are established to watch for:
 *    a) Device status changes (battery, location, SOS).
 *    b) User profile changes (names, avatars).
 * 3. Updates are manually merged into the TanStack Query cache to ensure UI responsiveness.
 * 4. A 5-second interval forces a recalculation of "online" status without requiring a DB hit.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  collection, getDocs, onSnapshot, doc, getDoc,
  query, where, documentId, addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as mapHelpers from '../utils/mapHelpers';
import { useAuth } from '../context/AuthContext';
import { reverseGeocode } from '../utils/geocode';
import { useToast } from '../context/ToastContext';

/**
 * Generates a unique cache key for TanStack Query.
 * @param {string} uid - The Firebase Auth UID of the current logged-in user.
 * @returns {Array} A stable query key like ['braceletUsers', 'user123'].
 */
export const braceletQueryKey = (uid) => ['braceletUsers', uid];

/**
 * @function fetchBraceletUsers
 * @description Performs a deep fetch and merge of all IDs, profiles, and statuses.
 * @param {string} uid - Current app user ID.
 * @returns {Promise<{users: Array, appUserData: Object}>} Merged data ready for the UI.
 * 
 * @example
 * // Resulting user object in the 'users' array:
 * {
 *   id: "BR-001",
 *   name: "Lolo Pedro", // Merged with nickname from appUser
 *   position: [14.5, 120.9],
 *   battery: 85,
 *   braceletOn: true,
 *   online: true,
 *   ...
 * }
 */
async function fetchBraceletUsers(uid) {
  // 1. Establish the source of truth: The appUser doc defines which bracelets we "own".
  const appUserRef = doc(db, 'appUsers', uid);
  const appUserSnap = await getDoc(appUserRef);

  // Edge case: New user or deleted doc. Return empty arrays to prevent app UI from crashing.
  if (!appUserSnap.exists()) {
    return { users: [], appUserData: null };
  }

  const appUserData = appUserSnap.data();
  const linkedBraceletsID = appUserData?.linkedBraceletsID;

  // Edge case: User logged in but hasn't linked any bracelets yet.
  if (!linkedBraceletsID || linkedBraceletsID.length === 0) {
    return { users: [], appUserData };
  }

  /**
   * 2. Parallel Fetching Strategy
   * We need data from two separate collections:
   * - 'braceletUsers': Persistent info (name, serial, emergency contacts).
   * - 'deviceStatus': Volatile status (GPS, battery, SOS, lastSeen).
   * Parallelizing this saves ~300-500ms of latency compared to sequential await.
   */
  const usersQuery = query(
    collection(db, 'braceletUsers'),
    where(documentId(), 'in', linkedBraceletsID)
  );
  const deviceQuery = query(
    collection(db, 'deviceStatus'),
    where(documentId(), 'in', linkedBraceletsID)
  );

  const [usersSnap, deviceSnap] = await Promise.all([
    getDocs(usersQuery),
    getDocs(deviceQuery),
  ]);

  /**
   * 3. Indexing Device Status
   * Convert the device results into a Map for O(1) lookup during merging.
   * key: deviceId (e.g., "PM-2023-001"), value: status object.
   */
  const deviceMap = new Map();
  deviceSnap.docs.forEach((d) => {
    deviceMap.set(d.id, { ...d.data(), id: d.id });
  });

  // 4. Nickname resolution logic
  // App-level nicknames take priority over the global bracelet name.
  const braceletNicknames = appUserData?.braceletNicknames || {};
  const merged = usersSnap.docs.map((u) => {
    // Utility function handles the heavy lifting of coordinate parsing and date conversion.
    const userObj = mapHelpers.buildUserWithDevice(u, deviceMap);
    
    // Apply user-defined nickname if it exists in appUser/braceletNicknames/BR_ID
    if (braceletNicknames[u.id]) {
      userObj.name = braceletNicknames[u.id];
    }
    return userObj;
  });

  return { users: merged, appUserData };
}

/**
 * @hook useBraceletData
 * @description The primary data interface for the application.
 * Manages caching, background sync, and real-time state management.
 */
export function useBraceletData() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const uid = currentUser?.uid;

  /**
   * 1. Foundation: TanStack Query
   * This handles the initial load state, success/error states, and ensures that
   * data is available the moment the user navigates between pages (via cache).
   */
  const { data, isLoading, error } = useQuery({
    queryKey: braceletQueryKey(uid),
    queryFn: () => fetchBraceletUsers(uid),
    enabled: !!uid, // Wait for auth to resolve
    placeholderData: keepPreviousData, // Prevent flickering during background refreshes
  });

  const braceletUsers = data?.users ?? [];
  const appUserData = data?.appUserData ?? null;

  /**
   * 2. The GPS/Battery Engine (Real-time listener)
   * Watches 'deviceStatus' for tiny bits of data changing frequently.
   * This listener updates the cache MANUALLY to avoid refetching the whole 'braceletUsers' profile.
   */
  useEffect(() => {
    if (!uid || !appUserData) return;

    const linkedBraceletsID = appUserData?.linkedBraceletsID;
    if (!linkedBraceletsID || linkedBraceletsID.length === 0) return;

    const deviceQuery = query(
      collection(db, 'deviceStatus'),
      where(documentId(), 'in', linkedBraceletsID)
    );

    const unsub = onSnapshot(deviceQuery, (snapshot) => {
      const updatesByUser = new Map();
      snapshot.docChanges().forEach((change) => {
        const dd = change.doc.data();
        const docId = change.doc.id;

        if (change.type === 'added' || change.type === 'modified') {
          updatesByUser.set(docId, { ...dd, id: docId });
        }
        // Handle deletion if a device doc is actually removed from the DB
        if (change.type === 'removed') {
          updatesByUser.set(docId, null);
        }
      });

      if (updatesByUser.size === 0) return;

      /**
       * IMMUTABLE CACHE UPDATE
       * Directly patches the TanStack Query data. This is WHY the map markers
       * move instantly without the page refreshing or showing a "loading" state.
       */
      queryClient.setQueryData(braceletQueryKey(uid), (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((u) => {
            if (!updatesByUser.has(u.id)) return u;
            const dd = updatesByUser.get(u.id);
            
            // If device doc was deleted, reset UI status fields to safe defaults
            if (dd === null) {
              return {
                ...u,
                battery: 0,
                braceletOn: false,
                lastSeen: null,
                sos: false,
                position: u.position,
                online: false,
              };
            }

            // Parse raw Firestore fields into UI-friendly formats
            const loc = mapHelpers.parseLocation(dd.location) || mapHelpers.parseLocation(dd);
            const lastSeen = mapHelpers.parseFirestoreDate(dd.lastSeen);
            const online = mapHelpers.isUserOnline(lastSeen);

            return {
              ...u,
              battery: Number(dd.battery ?? u.battery),
              // Safety: If device is offline (heartbeat missed), we FORCE braceletOn to false 
              // to prevent the user from thinking a disconnected device is still "monitoring".
              braceletOn: online ? Boolean(dd.isBraceletOn ?? u.braceletOn) : false,
              lastSeen,
              sos: (dd.sos && (dd.sos.active ?? dd.sos)) || false,
              position: loc || u.position,
              online,
              currentGeofenceId: dd.currentGeofenceId ?? u.currentGeofenceId,
              deviceStatusId: dd.id ?? u.deviceStatusId,
            };
          }),
        };
      });
    }, (err) => {
      console.error('CRITICAL: Device status listener failure:', err);
    });

    return () => unsub();
  }, [uid, appUserData, queryClient]);

  /**
   * 3. The Profile Engine (Real-time listener)
   * Watches 'braceletUsers' for static info changes (Name, Avatar, Contacts).
   * Separated from the status listener because these change much less frequently.
   */
  useEffect(() => {
    if (!uid || !appUserData) return;

    const linkedBraceletsID = appUserData?.linkedBraceletsID;
    if (!linkedBraceletsID || linkedBraceletsID.length === 0) return;

    const usersQuery = query(
      collection(db, 'braceletUsers'),
      where(documentId(), 'in', linkedBraceletsID)
    );

    const unsub = onSnapshot(usersQuery, (snapshot) => {
      const userUpdates = new Map();
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          userUpdates.set(change.doc.id, change.doc.data());
        }
      });

      if (userUpdates.size === 0) return;

      queryClient.setQueryData(braceletQueryKey(uid), (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((u) => {
            if (!userUpdates.has(u.id)) return u;
            const newData = userUpdates.get(u.id);
            return {
              ...u,
              // Nickname logic reapplied here to maintain user preference over global name
              name: appUserData?.braceletNicknames?.[u.id] || newData.name || u.name,
              avatar: newData.avatar || u.avatar,
              emergencyContacts: newData.emergencyContacts || u.emergencyContacts || [],
              serialNumber: newData.serialNumber || u.serialNumber,
            };
          }),
        };
      });
    }, (err) => {
      console.error('CRITICAL: Profile listener failure:', err);
    });

    return () => unsub();
  }, [uid, appUserData, queryClient]);

  /**
   * 4. Heartbeat Monitor (Client-side interval)
   * PURPOSE: Firestore only sends updates when data CHANGES. 
   * If a device stops sending signals, its Firestore data stays the same (lastSeen doesn't move).
   * This interval runs every 5s to check if 'lastSeen' is now too old, 
   * effectively turning the "online" dot grey without needing a server update.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.setQueryData(braceletQueryKey(uid), (old) => {
        if (!old) return old;
        let hasChanges = false;
        const updatedUsers = old.users.map((u) => {
          const online = mapHelpers.isUserOnline(u.lastSeen);
          const braceletOn = online ? u.braceletOn : false;
          
          // Only update state if the online status actually toggled (performance optimization)
          if (u.online !== online || u.braceletOn !== braceletOn) {
            hasChanges = true;
            return { ...u, online, braceletOn };
          }
          return u;
        });
        return hasChanges ? { ...old, users: updatedUsers } : old;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [uid, queryClient]);

  return { braceletUsers, loading: isLoading, error: error?.message || null };
}

/**
 * @hook useSosReportGenerator
 * @description Logic engine that monitors the SOS status of all users.
 * Transition detection: It looks for SOS changing from TRUE to FALSE (resolved).
 * When resolved, it automatically crafts a Firestore report document.
 */
export function useSosReportGenerator(braceletUsers) {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  // We use a ref to persist previous states across re-renders without triggering new ones.
  const previousSosStates = useRef(new Map());

  useEffect(() => {
    if (!currentUser || !braceletUsers?.length) return;

    braceletUsers.forEach((user) => {
      const currentSos = user.sos || false;
      const previousSos = previousSosStates.current.get(user.id);

      /**
       * LOGIC: SOS True → False transition detector.
       * Why: We only want to generate a report once an emergency is OVER.
       */
      if (previousSos === true && currentSos === false) {
        (async () => {
          try {
            const loc = user.position;
            let locationAddress = 'Unknown Location';
            
            // Resolve the coordinates to a street address for readability in the report list
            if (loc && loc.length === 2) {
              const addr = await reverseGeocode(loc[0], loc[1]);
              if (addr) locationAddress = addr;
            }

            const reportDate = new Date();

            // Create the record in the 'reports' collection
            await addDoc(collection(db, 'reports'), {
              braceletStatus: user.braceletOn ?? false,
              avatar: null, // Future feature: incident photos
              date: reportDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              time: reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              location: locationAddress,
              appUserId: currentUser.uid,
              appUserName: currentUser.displayName || 'App User',
              braceletUserId: user.id,
              braceletUserName: user.name || 'Unknown Bracelet',
            });
            
            // Feedback to the user that saving was successful
            addToast('SOS Resolved: New incident report generated.', 'success');
          } catch (err) {
            console.error('REPORT GEN ERROR:', err);
          }
        })();
      }

      // Update state for next tick
      previousSosStates.current.set(user.id, currentSos);
    });
  }, [braceletUsers, currentUser, addToast]);
}
