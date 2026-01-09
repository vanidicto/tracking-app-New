// src/utils/mapHelpers.js
import L from 'leaflet';

// Parse Firestore timestamps from SDK or REST format into JS Date (or null)
export function parseFirestoreDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value?.timestampValue) return new Date(value.timestampValue);
  if (typeof value === 'string') return new Date(value);
  return null;
}

// Get latitude/longitude from different shapes
export function parseLocation(locationField) {
  if (locationField?.arrayValue?.values) {
    const vals = locationField.arrayValue.values;
    const lat = vals[0]?.doubleValue ?? null;
    const lng = vals[1]?.doubleValue ?? null;
    if (lat !== null && lng !== null) return [lat, lng];
  }
  if (typeof locationField === 'object' && locationField !== null) {
    if ('latitude' in locationField && 'longitude' in locationField) {
      return [locationField.latitude, locationField.longitude];
    }
    if ('lat' in locationField && 'lng' in locationField) {
      return [locationField.lat, locationField.lng];
    }
  }
  if (Array.isArray(locationField) && locationField.length >= 2) {
    return [locationField[0], locationField[1]];
  }
  return null;
}

// Build a user object merged with deviceStatus data
export function buildUserWithDevice(userDoc, deviceMap) {
  const userData = userDoc.data();
  const deviceData = deviceMap.get(userDoc.id) || {};
  const location = parseLocation(deviceData.location) || parseLocation(deviceData);
  const lastSeenDate = parseFirestoreDate(deviceData.lastSeen);
  const online = isUserOnline(lastSeenDate);

  // LOGIC FIX: If offline, force braceletOn to false
  const braceletOn = online ? Boolean(deviceData.isBraceletOn ?? false) : false;

  return {
    id: userDoc.id,
    name: userData.name || 'Unnamed User',
    avatar:
      userData.avatar ||
      'https://i.pinimg.com/originals/98/1d/6b/981d6b2e0ccb5e968a0618c8d47671da.jpg',
    battery: Number(deviceData.battery ?? 0),
    braceletOn: braceletOn,
    pulseRate: deviceData.pulseRate ?? null,
    lastSeen: lastSeenDate,
    sos: (deviceData.sos && (deviceData.sos.active ?? deviceData.sos)) || false,
    position: location,
    online: online,
    currentGeofenceId: deviceData.currentGeofenceId || null,
    deviceStatusId: deviceData.id || null,
  };
}

// Create custom marker icon for users
export const createCustomIcon = (person) =>
  L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="marker-content">
        <img src="${person.avatar}" alt="${person.name}" class="marker-image" />
        <div class="marker-status ${person.online && person.braceletOn ? 'online' : 'offline'}"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -40],
  });

// Helper to determine if user is online based on lastSeen
export function isUserOnline(lastSeen, thresholdMinutes = 1) {
  if (!lastSeen) return false;
  return new Date().getTime() - lastSeen.getTime() < thresholdMinutes * 60 * 1000;
}
