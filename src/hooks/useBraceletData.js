// src/hooks/useBraceletData.js
// TanStack Query-based hook for bracelet data with real-time Firestore sync
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

// ─── Query Key ───────────────────────────────────────────────
export const braceletQueryKey = (uid) => ['braceletUsers', uid];

// ─── Initial Fetch Function ─────────────────────────────────
// Performs the one-time fetch of appUser → braceletUsers + deviceStatus
async function fetchBraceletUsers(uid) {
  // 1. Get linked bracelet IDs from the current appUser
  const appUserRef = doc(db, 'appUsers', uid);
  const appUserSnap = await getDoc(appUserRef);

  if (!appUserSnap.exists()) {
    return { users: [], appUserData: null };
  }

  const appUserData = appUserSnap.data();
  const linkedBraceletsID = appUserData?.linkedBraceletsID;

  if (!linkedBraceletsID || linkedBraceletsID.length === 0) {
    return { users: [], appUserData };
  }

  // 2. Fetch braceletUsers and deviceStatus in parallel
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

  // Build device map keyed by doc.id (Serial Number)
  const deviceMap = new Map();
  deviceSnap.docs.forEach((d) => {
    deviceMap.set(d.id, { ...d.data(), id: d.id });
  });

  // Merge users with device data, applying nicknames
  const braceletNicknames = appUserData?.braceletNicknames || {};
  const merged = usersSnap.docs.map((u) => {
    const userObj = mapHelpers.buildUserWithDevice(u, deviceMap);
    if (braceletNicknames[u.id]) {
      userObj.name = braceletNicknames[u.id];
    }
    return userObj;
  });

  return { users: merged, appUserData };
}

// ─── Main Hook ──────────────────────────────────────────────
export function useBraceletData() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const uid = currentUser?.uid;

  // TanStack Query for the initial fetch + caching
  const { data, isLoading, error } = useQuery({
    queryKey: braceletQueryKey(uid),
    queryFn: () => fetchBraceletUsers(uid),
    enabled: !!uid,
    placeholderData: keepPreviousData,
  });

  const braceletUsers = data?.users ?? [];
  const appUserData = data?.appUserData ?? null;

  // ─── Real-time device status listener ────────────────────
  useEffect(() => {
    if (!uid || !appUserData) return;

    const linkedBraceletsID = appUserData?.linkedBraceletsID;
    if (!linkedBraceletsID || linkedBraceletsID.length === 0) return;

    // Scoped listener — only listen to the user's linked devices
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
        if (change.type === 'removed') {
          updatesByUser.set(docId, null);
        }
      });

      if (updatesByUser.size === 0) return;

      // Push updates directly into the TanStack Query cache
      queryClient.setQueryData(braceletQueryKey(uid), (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((u) => {
            if (!updatesByUser.has(u.id)) return u;
            const dd = updatesByUser.get(u.id);
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
            const loc = mapHelpers.parseLocation(dd.location) || mapHelpers.parseLocation(dd);
            const lastSeen = mapHelpers.parseFirestoreDate(dd.lastSeen);
            const online = mapHelpers.isUserOnline(lastSeen);

            return {
              ...u,
              battery: Number(dd.battery ?? u.battery),
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
      console.error('Error in device status listener:', err);
    });

    return () => unsub();
  }, [uid, appUserData, queryClient]);

  // ─── Real-time braceletUsers listener (names, avatars) ───
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
              name: appUserData?.braceletNicknames?.[u.id] || newData.name || u.name,
              avatar: newData.avatar || u.avatar,
              emergencyContacts: newData.emergencyContacts || u.emergencyContacts || [],
              serialNumber: newData.serialNumber || u.serialNumber,
            };
          }),
        };
      });
    }, (err) => {
      console.error('Error in bracelet users listener:', err);
    });

    return () => unsub();
  }, [uid, appUserData, queryClient]);

  // ─── Periodic online-status refresh (every 5s) ───────────
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.setQueryData(braceletQueryKey(uid), (old) => {
        if (!old) return old;
        let hasChanges = false;
        const updatedUsers = old.users.map((u) => {
          const online = mapHelpers.isUserOnline(u.lastSeen);
          const braceletOn = online ? u.braceletOn : false;
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

// ─── SOS Report Generator Hook ─────────────────────────────
// Watches for SOS true→false transitions and auto-generates reports.
// Should be called ONCE in AppLayout (not per page).
export function useSosReportGenerator(braceletUsers) {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const previousSosStates = useRef(new Map());

  useEffect(() => {
    if (!currentUser || !braceletUsers?.length) return;

    braceletUsers.forEach((user) => {
      const currentSos = user.sos || false;
      const previousSos = previousSosStates.current.get(user.id);

      // Detect SOS True → False transition
      if (previousSos === true && currentSos === false) {
        (async () => {
          try {
            const loc = user.position;
            let locationAddress = 'Unknown Location';
            if (loc && loc.length === 2) {
              const addr = await reverseGeocode(loc[0], loc[1]);
              if (addr) locationAddress = addr;
            }

            const reportDate = new Date();

            await addDoc(collection(db, 'reports'), {
              braceletStatus: user.braceletOn ?? false,
              avatar: null,
              date: reportDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              time: reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              location: locationAddress,
              appUserId: currentUser.uid,
              appUserName: currentUser.displayName || 'App User',
              braceletUserId: user.id,
              braceletUserName: user.name || 'Unknown Bracelet',
            });
            addToast('SOS Resolved: New incident report generated.', 'success');
          } catch (err) {
            console.error('Error generating report:', err);
          }
        })();
      }

      previousSosStates.current.set(user.id, currentSos);
    });
  }, [braceletUsers, currentUser, addToast]);
}
