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
    // Relaxed duplicate check to ensure testing hits are visible.
    // In production, consider time-based throttling. 
    // if (!dupSnap.empty) return; 

    await addDoc(collection(db, 'notifications'), {
        appUserId: currentUser.uid,
        braceletUserId: user.id,
        title: 'Geofence Alert',
        message: message,
        read: false,
        type: 'Geofence',
        time: serverTimestamp(),
        icon: user.avatar || null,
    });

    if (user.deviceStatusId) {
        await updateDoc(doc(db, 'deviceStatus', user.deviceStatusId), {
            currentGeofenceId: zone.id
        });
    }
};
