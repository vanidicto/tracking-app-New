// src/utils/geofenceUtils.js
import L from "leaflet";

/**
 * Checks if a user is inside any given geofences.
 * Returns an object with the current alerts and newly detected entries.
 */
export const checkGeofenceTransitions = (braceletUsers, geofences, alertedUsersSet) => {
    const currentAlerts = [];
    const newlyDetected = [];
    const usersToUpdateOffline = [];

    braceletUsers.forEach((user) => {
        if (!Array.isArray(user.position) || user.position.length !== 2) return;

        const userLatLng = L.latLng(user.position[0], user.position[1]);
        let insideZoneId = null;
        let insideZoneName = null;

        for (const zone of geofences) {
            if (!zone.latlngs) continue;
            const circleCenter = L.latLng(zone.latlngs.lat, zone.latlngs.lng);
            const distance = userLatLng.distanceTo(circleCenter);

            // Buffer for visual overlap
            const avatarVisualRadius = 10;

            if (distance <= zone.radius + avatarVisualRadius) {
                insideZoneId = zone.id;
                insideZoneName = zone.name;
                currentAlerts.push(`${user.name} entered ${zone.name}`);
                break;
            }
        }

        if (insideZoneId) {
            if (user.currentGeofenceId !== insideZoneId) {
                const alertKey = `${user.id}-${insideZoneId}`;
                if (!alertedUsersSet.has(alertKey)) {
                    alertedUsersSet.add(alertKey);
                    newlyDetected.push({
                        user,
                        zone: { id: insideZoneId, name: insideZoneName },
                        message: `${user.name} entered ${insideZoneName}`
                    });
                }
            }
        } else {
            if (user.currentGeofenceId && user.deviceStatusId) {
                usersToUpdateOffline.push({ id: user.deviceStatusId });
            }
        }
    });

    return { currentAlerts, newlyDetected, usersToUpdateOffline };
};
