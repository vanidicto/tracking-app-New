import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, onSnapshot, doc, getDoc, query, where, documentId, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as mapHelpers from '../utils/mapHelpers';
import { useAuth } from '../context/AuthContext';
import { reverseGeocode } from '../utils/geocode';
import { useToast } from '../context/ToastContext';

export function useBraceletUsers() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [braceletUsers, setBraceletUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track previous SOS states to detect when SOS turns off
  const previousSosStates = useRef(new Map());

  useEffect(() => {
    let unsubDevice = null;
    let unsubUsers = null;

    async function initialLoad() {
      previousSosStates.current.clear();
      // If no user is logged in, do nothing.
      if (!currentUser) {
        setBraceletUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Get linked bracelet IDs from the current appUser's document
        const appUserRef = doc(db, 'appUsers', currentUser.uid);
        const appUserSnap = await getDoc(appUserRef);

        if (!appUserSnap.exists()) {
          console.warn("App user data not found for UID:", currentUser.uid);
          setBraceletUsers([]);
          setLoading(false);
          return;
        }

        const appUserData = appUserSnap.data();
        const linkedBraceletsID = appUserData?.linkedBraceletsID;
        const appUserName = appUserData?.name || "App User";

        // 2. If the user has no linked bracelets, return an empty list.
        if (!linkedBraceletsID || linkedBraceletsID.length === 0) {
          setBraceletUsers([]);
          setLoading(false);
          return;
        }

        // 3. Fetch only the braceletUsers whose IDs are in the linkedBraceletsID array.
        const usersQuery = query(collection(db, 'braceletUsers'), where(documentId(), 'in', linkedBraceletsID));

        // Fetch deviceStatus using the same IDs (Serial Numbers ARE the Document IDs)
        const deviceQuery = query(collection(db, 'deviceStatus'), where(documentId(), 'in', linkedBraceletsID));

        const [usersSnap, deviceSnap] = await Promise.all([
          getDocs(usersQuery),
          getDocs(deviceQuery),
        ]);

        // Key deviceMap by doc.id (which is the Serial Number)
        const deviceMap = new Map();
        deviceSnap.docs.forEach((d) => {
          deviceMap.set(d.id, { ...d.data(), id: d.id });
        });

        const braceletNicknames = appUserData?.braceletNicknames || {};
        const merged = usersSnap.docs.map((u) => {
          const userObj = mapHelpers.buildUserWithDevice(u, deviceMap);
          if (braceletNicknames[u.id]) {
            userObj.name = braceletNicknames[u.id];
          }
          return userObj;
        });

        // Map for report generation
        const braceletNameMap = new Map();
        usersSnap.docs.forEach(doc => {
          braceletNameMap.set(doc.id, doc.data().name || "Unknown Bracelet");
        });

        setBraceletUsers(merged);
        setLoading(false);

        unsubDevice = onSnapshot(collection(db, 'deviceStatus'), (snapshot) => {
          const updatesByUser = new Map();
          snapshot.docChanges().forEach((change) => {
            const dd = change.doc.data();
            // Use doc.id as the key (Serial Number = Document ID)
            const uid = change.doc.id;
            if (change.type === 'added' || change.type === 'modified') {
              updatesByUser.set(uid, { ...dd, id: change.doc.id });

              // Check for SOS transition: True -> False (Incident Resolved)
              const newSos = (dd.sos && (dd.sos.active ?? dd.sos)) || false;
              const oldSos = previousSosStates.current.get(uid);

              if (oldSos === true && newSos === false) {
                // Generate Report
                (async () => {
                  try {
                    const loc = mapHelpers.parseLocation(dd.location) || mapHelpers.parseLocation(dd);
                    let locationAddress = "Unknown Location";
                    if (loc) {
                      const addr = await reverseGeocode(loc[0], loc[1]);
                      if (addr) locationAddress = addr;
                    }

                    let reportDate = new Date();
                    if (dd.sos && dd.sos.timestamp) {
                      const parsed = mapHelpers.parseFirestoreDate(dd.sos.timestamp);
                      if (parsed) reportDate = parsed;
                    }

                    await addDoc(collection(db, 'reports'), {
                      braceletStatus: dd.isBraceletOn ?? false,
                      avatar: null,
                      date: reportDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                      time: reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                      location: locationAddress,
                      appUserId: currentUser.uid,
                      appUserName: appUserName,
                      braceletUserId: uid,
                      braceletUserName: braceletNameMap.get(uid) || "Unknown Bracelet"
                    });
                    addToast('SOS Resolved: New incident report generated.', 'success');
                  } catch (err) {
                    console.error("Error generating report:", err);
                  }
                })();
              }
              previousSosStates.current.set(uid, newSos);
            }
            if (change.type === 'removed') {
              updatesByUser.set(uid, null);
              previousSosStates.current.delete(uid);
            }
          });

          if (updatesByUser.size === 0) return;

          setBraceletUsers((current) =>
            current.map((u) => {
              if (!updatesByUser.has(u.id)) return u;
              const dd = updatesByUser.get(u.id);
              if (dd === null) {
                return {
                  ...u,
                  battery: 0,
                  braceletOn: false,
                  lastSeen: null,
                  sos: false,
                  position: u.position, // Keep last known position
                  online: false,
                };
              }
              const loc = mapHelpers.parseLocation(dd.location) || mapHelpers.parseLocation(dd);
              const lastSeen = mapHelpers.parseFirestoreDate(dd.lastSeen);
              const online = mapHelpers.isUserOnline(lastSeen);

              return {
                ...u,
                battery: Number(dd.battery ?? u.battery),
                // LOGIC FIX: If offline, force braceletOn to false
                braceletOn: online ? Boolean(dd.isBraceletOn ?? u.braceletOn) : false,
                lastSeen,
                sos: (dd.sos && (dd.sos.active ?? dd.sos)) || false,
                position: loc || u.position, // Keep old position if new one is null
                online: online,
                currentGeofenceId: dd.currentGeofenceId ?? u.currentGeofenceId,
                deviceStatusId: dd.id ?? u.deviceStatusId,
              };
            })
          );
        }, (err) => {
          console.error("Error in device status listener:", err);
          setError("Lost connection to device status updates.");
        });

        // 4. Real-time listener for braceletUsers (for names, avatars, emergency contacts)
        unsubUsers = onSnapshot(usersQuery, (snapshot) => {
          const userUpdates = new Map();
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              userUpdates.set(change.doc.id, change.doc.data());
            }
          });

          if (userUpdates.size === 0) return;

          setBraceletUsers((current) =>
            current.map((u) => {
              if (!userUpdates.has(u.id)) return u;
              const newData = userUpdates.get(u.id);
              return {
                ...u,
                name: appUserData?.braceletNicknames?.[u.id] || newData.name || u.name,
                avatar: newData.avatar || u.avatar,
                emergencyContacts: newData.emergencyContacts || u.emergencyContacts || [],
                serialNumber: newData.serialNumber || u.serialNumber,
              };
            })
          );
        }, (err) => {
          console.error("Error in bracelet users listener:", err);
        });
      } catch (err) {
        console.error("Error loading linked bracelet users:", err);
        setError("Failed to load bracelet data.");
        setLoading(false);
      }
    }

    initialLoad();

    return () => {
      if (unsubDevice) unsubDevice();
      if (unsubUsers) unsubUsers();
    };
  }, [currentUser]);

  // Periodically refresh online status (every minute) to mark users as offline if data is stale
  useEffect(() => {
    const interval = setInterval(() => {
      setBraceletUsers((current) => {
        let hasChanges = false;
        const updatedUsers = current.map((u) => {
          const online = mapHelpers.isUserOnline(u.lastSeen);
          // LOGIC FIX: If user timed out (went offline), turn off bracelet status locally
          const braceletOn = online ? u.braceletOn : false;

          if (u.online !== online || u.braceletOn !== braceletOn) {
            hasChanges = true;
            return { ...u, online, braceletOn };
          }
          return u;
        });
        return hasChanges ? updatedUsers : current;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return { braceletUsers, loading, error };
}
