/**
 * @file geofenceUtils.js
 * @summary Logic engine for calculating geofence entries and exits.
 * Purpose: Determines when a user has crossed a virtual boundary (circular zone) 
 * and maintains the state of which users have already been alerted to avoid spam notifications.
 */

import L from "leaflet";

/**
 * @function checkGeofenceTransitions
 * @description Analyzes current user positions against a set of circular geofences.
 * Matches are based on radial distance.
 * 
 * @param {Array} braceletUsers - Array of currently tracked users (with GPS positions).
 * @param {Array} geofences - Array of circle definitions: { id, name, latlngs {lat, lng}, radius }.
 * @param {Set} alertedUsersSet - A persistent Set tracking "userId-zoneId" to prevent duplicate alerts.
 * 
 * @returns {Object} {
 *   currentAlerts: Array of human strings for immediate UI display,
 *   newlyDetected: Array of event objects for trigger-based actions (e.g. push notifications),
 *   usersToUpdateOffline: IDs of devices that left a zone and need their 'currentGeofenceId' reset in DB.
 * }
 * 
 * @example
 * // newlyDetected return sample:
 * {
 *   user: { id: "U-1", name: "Lola" },
 *   zone: { id: "Z-5", name: "Home" },
 *   message: "Lola entered Home"
 * }
 */
export const checkGeofenceTransitions = (braceletUsers, geofences, alertedUsersSet) => {
    // Accumulators for the different types of results
    const currentAlerts = [];
    const newlyDetected = [];
    const usersToUpdateOffline = [];

    braceletUsers.forEach((user) => {
        // Validation: Ignore users with missing or malformed GPS data
        if (!Array.isArray(user.position) || user.position.length !== 2) return;

        /**
         * FLOW: Math Calculation
         * Convert coordinates to Leaflet LatLng objects to use the high-precision 
         * .distanceTo() method (Haversine formula).
         */
        const userLatLng = L.latLng(user.position[0], user.position[1]);
        let insideZoneId = null;
        let insideZoneName = null;

        /**
         * SEARCH: Check user against every active geofence zone.
         * Optimization: We break the loop as soon as ONE zone is found (assuming zones don't overlap).
         */
        for (const zone of geofences) {
            if (!zone.latlngs) continue;
            
            const circleCenter = L.latLng(zone.latlngs.lat, zone.latlngs.lng);
            const distance = userLatLng.distanceTo(circleCenter);

            // Radius + 1 meter buffer to account for minor GPS jitter
            if (distance <= zone.radius + 1) {
                insideZoneId = zone.id;
                insideZoneName = zone.name;
                currentAlerts.push(user.name, zone.name);
                break;
            }
        }

        /**
         * CONDITION: Transition Detection
         * Case A: User is inside a zone.
         */
        if (insideZoneId) {
            /**
             * Check if this is a NEW entry.
             * user.currentGeofenceId represents the LAST known state from the database.
             */
            if (user.currentGeofenceId !== insideZoneId) {
                const alertKey = `${user.id}-${insideZoneId}`;
                
                // Only alert if we haven't already alerted for THIS specific entry session.
                if (!alertedUsersSet.has(alertKey)) {
                    alertedUsersSet.add(alertKey);
                    newlyDetected.push({
                        user,
                        zone: { id: insideZoneId, name: insideZoneName },
                        message: `${user.name} entered ${insideZoneName}`
                    });
                }
            }
        } 
        /**
         * Case B: User is NOT inside any zone.
         */
        else {
            /**
             * EXIT DETECTION: 
             * If they were previously marked as being inside a zone, they have now LEFT.
             */
            if (user.currentGeofenceId && user.deviceStatusId) {
                usersToUpdateOffline.push({ id: user.deviceStatusId });
                
                /**
                 * CLEANUP: Reset alert key in the tracking set.
                 * This allows the system to notify the user AGAIN if they re-enter the same zone later.
                 */
                alertedUsersSet.delete(`${user.id}-${user.currentGeofenceId}`);
            }
        }
    });

    return { currentAlerts, newlyDetected, usersToUpdateOffline };
};
