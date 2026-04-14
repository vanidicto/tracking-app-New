// src/context/GeofenceMonitorProvider.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useBraceletUsers } from './BraceletDataProvider';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as geofenceUtils from '../utils/geofenceUtils';
import * as notificationService from '../services/notificationService';

const GeofenceMonitorContext = createContext(null);

export function GeofenceMonitorProvider({ children }) {
    const { braceletUsers } = useBraceletUsers();
    const { currentUser } = useAuth();
    
    const [geofences, setGeofences] = useState([]);
    const [geofencesLoaded, setGeofencesLoaded] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState([]);
    
    // Use a ref to persist the alerted set across renders without triggering them
    const alertedUsersRef = useRef(new Set());
    // Ref to avoid firing alerts on the very first evaluation
    const isFirstRun = useRef(true);

    // 1. Fetch Geofences
    useEffect(() => {
        if (!currentUser) {
            setGeofences([]);
            setGeofencesLoaded(false);
            return;
        }

        const q = query(
            collection(db, "geofences"),
            where("appUserId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedZones = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    appUserName: currentUser.displayName,
                    id: doc.id,
                    name: data.name,
                    radius: data.radius,
                    latlngs: data.coordinates,
                    type: data.type,
                };
            });
            setGeofences(fetchedZones);
            setGeofencesLoaded(true);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // 2. Process Transitions
    useEffect(() => {
        // Guard: Don't process until both users and geofences are loaded
        if (!currentUser || !geofencesLoaded || !braceletUsers) return;

        const { currentAlerts, newlyDetected, usersToUpdateOffline } = geofenceUtils.checkGeofenceTransitions(
            braceletUsers,
            geofences,
            alertedUsersRef.current
        );

        setActiveAlerts(currentAlerts);

        // Update statuses for users who left their zones
        usersToUpdateOffline.forEach(status => {
            updateDoc(doc(db, 'deviceStatus', status.id), { currentGeofenceId: null })
                .catch(e => console.error("Error clearing geofence status", e));
        });

        // If it's the very first time we run this logic after loading, 
        // we skip notifications to avoid alerting for people who were already in the zone.
        // The checking logic above will have added them to alertedUsersRef and updated the DB if needed.
        if (isFirstRun.current) {
            isFirstRun.current = false;
        } else if (newlyDetected.length > 0) {
            newlyDetected.forEach(det => {
               notificationService.saveGeofenceNotification(currentUser, det).catch(err => 
                   console.error("Error saving geofence notification:", err)
               );
            });
        }
    }, [braceletUsers, geofences, geofencesLoaded, currentUser]);

    return (
        <GeofenceMonitorContext.Provider value={{ geofences, activeAlerts, geofencesLoaded }}>
            {children}
        </GeofenceMonitorContext.Provider>
    );
}

export function useGeofenceMonitor() {
    const ctx = useContext(GeofenceMonitorContext);
    if (!ctx) throw new Error('useGeofenceMonitor must be used inside GeofenceMonitorProvider');
    return ctx;
}
