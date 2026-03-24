import L from 'leaflet';
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
    // Add safety details
    serialNumber: userData.serialNumber || deviceData.id || null,
    emergencyContacts: userData.emergencyContacts || [],
  };
}


// Group users by location to handle overlapping markers (Proximity-based bundling)
export function groupUsersByLocation(users, proximity = 0.00015) {
  const groups = [];

  users.forEach((user) => {
    if (!user.position) return;

    // Find an existing group within the proximity threshold
    const nearbyGroup = groups.find(group => {
      const dLat = Math.abs(group.position[0] - user.position[0]);
      const dLng = Math.abs(group.position[1] - user.position[1]);
      return dLat < proximity && dLng < proximity;
    });

    if (nearbyGroup) {
      nearbyGroup.users.push(user);
    } else {
      groups.push({
        position: [...user.position], // Use the first user as the "anchor"
        users: [user],
      });
    }
  });

  return groups;
}

const iconCache = new Map();

// Create custom marker icon for users or groups of users
export const createCustomIcon = (data) => {
  const isGroup = Array.isArray(data.users) && data.users.length > 1;
  const person = isGroup ? data.users[0] : (data.users ? data.users[0] : data);
  const count = isGroup ? data.users.length : 1;

  // Determine if anyone in the group is online or has SOS active
  const anyOnline = isGroup ? data.users.some(u => u.online && u.braceletOn) : (person.online && person.braceletOn);
  const anySos = isGroup ? data.users.some(u => u.sos) : person.sos;

  // Generate a unique cache key for this specific visual state
  const cacheKey = `${isGroup}-${person.id}-${count}-${anyOnline}-${anySos}-${person.avatar}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  // Generic neutral icon for groups (SVG representing multiple people)
  const groupIconSvg = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: #8b0000; margin-top: 2px;">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `;

  const icon = L.divIcon({
    className: `custom-marker-icon ${anySos ? 'sos-active' : ''}`,
    html: `
      <div class="marker-pin">
        <img src="/mark-container.svg" class="marker-bg" />
        <div class="marker-content ${isGroup ? 'group-content' : ''}">
          ${isGroup ? groupIconSvg : `<img src="${person.avatar}" alt="${person.name}" class="marker-image" />`}
          ${!isGroup ? `<div class="marker-status ${anyOnline ? 'online' : 'offline'}"></div>` : ''}
        </div>
        ${isGroup ? `<div class="marker-count-badge">${count}</div>` : ''}
      </div>
    `,
    iconSize: [52, 60],
    iconAnchor: [26, 60],
    popupAnchor: [0, -60],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};

// Helper to determine if user is online based on lastSeen
export function isUserOnline(lastSeen, thresholdMinutes = 1) {
  if (!lastSeen) return false;
  return new Date().getTime() - lastSeen.getTime() < thresholdMinutes * 60 * 1000;
}

