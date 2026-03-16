import defaultAvatar from '../assets/red.webp';

/**
 * Ensures Leaflet's default icons are correctly mapped to CDN URLs.
 * This is necessary for some build systems where local image imports fail.
 */
export function setupLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

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
  const isValid = (lat, lng) => {
    // If both are strictly 0, or coerce to 0, treat as invalid (GPS lost signal / Null Island)
    if (lat == null || lng == null) return false;
    if (Number(lat) === 0 && Number(lng) === 0) return false;
    return true;
  };

  if (locationField?.arrayValue?.values) {
    const vals = locationField.arrayValue.values;
    const lat = vals[0]?.doubleValue ?? null;
    const lng = vals[1]?.doubleValue ?? null;
    if (isValid(lat, lng)) return [lat, lng];
  }
  if (typeof locationField === 'object' && locationField !== null) {
    if ('latitude' in locationField && 'longitude' in locationField) {
      if (isValid(locationField.latitude, locationField.longitude)) {
        return [locationField.latitude, locationField.longitude];
      }
    }
    if ('lat' in locationField && 'lng' in locationField) {
      if (isValid(locationField.lat, locationField.lng)) {
        return [locationField.lat, locationField.lng];
      }
    }
  }
  if (Array.isArray(locationField) && locationField.length >= 2) {
    if (isValid(locationField[0], locationField[1])) {
      return [locationField[0], locationField[1]];
    }
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
    avatar: userData.avatar || defaultAvatar,
    battery: Number(deviceData.battery ?? 0),
    braceletOn: braceletOn,
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
      <div class="marker-pin">
        <img src="/mark-container.svg" class="marker-bg" />
        <div class="marker-content">
          <img src="${person.avatar}" alt="${person.name}" class="marker-image" />
          <div class="marker-status ${person.online && person.braceletOn ? 'online' : 'offline'}"></div>
        </div>
      </div>
    `,
    iconSize: [52, 60],
    iconAnchor: [26.5, 60],
    popupAnchor: [0, -60],
  });

// Helper to determine if user is online based on lastSeen
export function isUserOnline(lastSeen, thresholdMinutes = 1) {
  if (!lastSeen) return false;
  return new Date().getTime() - lastSeen.getTime() < thresholdMinutes * 60 * 1000;
}
