// src/services/geofenceService.js
import { db } from "../config/firebaseConfig";
import { collection, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";

/**
 * Saves a new geofence to Firestore.
 */
export const saveGeofence = async (currentUser, zoneName, latLng, radius) => {
    if (!zoneName || !latLng || !currentUser) throw new Error("Missing required data");

    const newDocRef = doc(collection(db, "geofences"));
    await setDoc(newDocRef, {
        appUserName: currentUser.displayName,
        appUserId: currentUser.uid,
        coordinates: { lat: latLng.lat, lng: latLng.lng },
        id: newDocRef.id,
        name: zoneName,
        radius: radius,
        type: "circle"
    });
    return newDocRef.id;
};

/**
 * Updates an existing geofence's position and radius.
 */
export const updateGeofence = async (id, latLng, radius) => {
    if (!id) return;
    const zoneRef = doc(db, "geofences", id);
    await updateDoc(zoneRef, {
        coordinates: { lat: latLng.lat, lng: latLng.lng },
        radius: radius
    });
};

/**
 * Deletes a geofence from Firestore.
 */
export const deleteGeofence = async (id) => {
    if (!id || typeof id !== 'string') return;
    await deleteDoc(doc(db, "geofences", id));
};
