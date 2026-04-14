// src/services/notificationService.js
import { db } from "../config/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, updateDoc } from "firebase/firestore";

/**
 * Saves a geofence entry notification to Firestore.
 */
export const saveGeofenceNotification = async (currentUser, detection) => { 
    if (!currentUser) return;
    const { user, zone, message } = detection;

    // Prevent duplicate notifications
    const dupQ = query(
        collection(db, 'notifications'),
        where('appUserId', '==', currentUser.uid),
        where('braceletUserId', '==', user.id),
        where('message', '==', message),
        limit(1)
    );

    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
        // Check if the existing notification is recent (e.g., last 5 minutes)
        const lastNotif = dupSnap.docs[0].data();
        const lastTime = lastNotif.time?.toMillis?.() || 0;
        if (Date.now() - lastTime < 5 * 60 * 1000) return;
    }

    await addDoc(collection(db, 'notifications'), {
        appUserId: currentUser.uid,
        braceletUserId: user.id,
        title: 'Geofence Alert',
        message: message,
        read: false,
        type: 'Geofence',
        time: serverTimestamp(),
        icon: user.avatar || null,
        coords: user.position ? { lat: user.position[0], lng: user.position[1] } : null,
    });

    if (user.deviceStatusId) {
        await updateDoc(doc(db, 'deviceStatus', user.deviceStatusId), {
            currentGeofenceId: zone.id
        });
    }
};

/**
 * Saves an SOS Alert notification to Firestore.
 */
export const saveSosNotification = async (currentUser, user) => {
    if (!currentUser || !user) return;

    await addDoc(collection(db, 'notifications'), {
        appUserId: currentUser.uid,
        braceletUserId: user.id,
        title: '🚨 SOS EMERGENCY',
        message: `${user.name} has triggered an SOS alert!`,
        read: false,
        type: 'sos_alert',
        time: serverTimestamp(),
        icon: user.avatar || null,
        coords: user.position ? { lat: user.position[0], lng: user.position[1] } : null,
    });
};

/**
 * Saves an SOS Resolved notification to Firestore.
 */
export const saveSosResolvedNotification = async (currentUser, user, reportId = null) => {
    if (!currentUser || !user) return;

    await addDoc(collection(db, 'notifications'), {
        appUserId: currentUser.uid,
        braceletUserId: user.id,
        title: '✅ SOS Resolved',
        message: `${user.name} is now safe.`,
        read: false,
        type: 'sos_resolved',
        reportId: reportId,
        time: serverTimestamp(),
        icon: user.avatar || null,
        coords: user.position ? { lat: user.position[0], lng: user.position[1] } : null,
    });
};
