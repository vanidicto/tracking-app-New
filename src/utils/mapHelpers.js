/**
 * @file mapHelpers.js
 * @summary Collection of utility functions for handling Leaflet maps, coordinate parsing, 
 * marker grouping (clustering), and dynamic icon generation.
 */

import L from 'leaflet';
import defaultAvatar from '../assets/red.webp';

/**
 * @function setupLeafletIcons
 * @description Fixes a common Leaflet issue where default markers don't load correctly 
 * in modern build systems (like Vite/Webpack) because the relative image paths break.
 * It manually maps the core assets to a reliable CDN.
 */
export function setupLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

/**
 * @function parseFirestoreDate
 * @description Normalizes various timestamp formats into a native JavaScript Date object.
 * This is CRITICAL because Firestore data can arrive as a Timestamp object, a REST string, 
 * or a raw Date depending on the environment and SDK.
 * 
 * @param {any} value - The raw date value from Firestore.
 * @returns {Date|null} A JS Date object or null if invalid.
 */
export function parseFirestoreDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Handle Firestore SDK 'Timestamp' object (has a toDate method)
  if (typeof value?.toDate === 'function') return value.toDate();
  // Handle Firestore REST API format
  if (value?.timestampValue) return new Date(value.timestampValue);
  // Handle raw ISO string
  if (typeof value === 'string') return new Date(value);
  return null;
}

/**
 * @function parseLocation
 * @description Extracts [lat, lng] from varied data shapes. 
 * Supports Firestore arrays, latitude/longitude objects, and short-form lat/lng objects.
 * 
 * EDGE CASE: "Null Island". If coordinates are exactly 0,0, they are treated as invalid 
 * (as GPS devices often default to 0,0 when they lose signal).
 * 
 * @param {Object|Array} locationField - The raw location data.
 * @returns {Array|null} [latitude, longitude] or null.
 */
export function parseLocation(locationField) {
  /**
   * Internal validator to filter out nulls and the 0,0 "lost signal" coordinate.
   */
  const isValid = (lat, lng) => {
    if (lat == null || lng == null) return false;
    // Strictly 0,0 is usually a GPS error, not a real location in most tracking contexts.
    if (Number(lat) === 0 && Number(lng) === 0) return false;
    return true;
  };

  // 1. Handle Firestore REST format: { arrayValue: { values: [...] } }
  if (locationField?.arrayValue?.values) {
    const vals = locationField.arrayValue.values;
    const lat = vals[0]?.doubleValue ?? null;
    const lng = vals[1]?.doubleValue ?? null;
    if (isValid(lat, lng)) return [lat, lng];
  }

  // 2. Handle standard objects
  if (typeof locationField === 'object' && locationField !== null) {
    // Shape: { latitude: X, longitude: Y }
    if ('latitude' in locationField && 'longitude' in locationField) {
      if (isValid(locationField.latitude, locationField.longitude)) {
        return [locationField.latitude, locationField.longitude];
      }
    }
    // Shape: { lat: X, lng: Y }
    if ('lat' in locationField && 'lng' in locationField) {
      if (isValid(locationField.lat, locationField.lng)) {
        return [locationField.lat, locationField.lng];
      }
    }
  }

  // 3. Handle simple arrays: [lat, lng]
  if (Array.isArray(locationField) && locationField.length >= 2) {
    if (isValid(locationField[0], locationField[1])) {
      return [locationField[0], locationField[1]];
    }
  }

  return null;
}

/**
 * @function buildUserWithDevice
 * @description Constructor-like function that merges user profile data with device status.
 * Normalizes all fields into a standard "App User" object used across all layouts.
 * 
 * @param {DocumentSnapshot} userDoc - The braceletUsers document.
 * @param {Map} deviceMap - Map of deviceStatus documents keyed by ID.
 */
export function buildUserWithDevice(userDoc, deviceMap) {
  const userData = userDoc.data();
  // Lookup the real-time status using the user's ID (which matches the device doc ID)
  const deviceData = deviceMap.get(userDoc.id) || {};
  
  // Extract location and date using our robust parsers
  const location = parseLocation(deviceData.location) || parseLocation(deviceData);
  const lastSeenDate = parseFirestoreDate(deviceData.lastSeen);
  
  // Determine if the user is considered "Active" right now
  const online = isUserOnline(lastSeenDate);

  /**
   * REASONING: If a device hasn't sent a heartbeat recently (offline), we assume the 
   * bracelet is effectively "Off" because we can't trust the last known 'isBraceletOn' flag.
   */
  const braceletOn = online ? Boolean(deviceData.isBraceletOn ?? false) : false;

  return {
    id: userDoc.id,
    name: userData.name || 'Unnamed User',
    avatar: userData.avatar || defaultAvatar,
    battery: Number(deviceData.battery ?? 0),
    braceletOn: braceletOn,
    lastSeen: lastSeenDate,
    // Handle SOS as either a boolean or a nested object { active: true }
    sos: (deviceData.sos && (deviceData.sos.active ?? deviceData.sos)) || false,
    position: location,
    online: online,
    currentGeofenceId: deviceData.currentGeofenceId || null,
    deviceStatusId: deviceData.id || null, // Shared document ID
    serialNumber: userData.serialNumber || deviceData.id || null,
    emergencyContacts: userData.emergencyContacts || [],
  };
}

/**
 * @function groupUsersByLocation
 * @description Proximity-based clustering algorithm.
 * Groups users who are physically close into a single "Group Marker".
 * This prevents the map from becoming cluttered when many people are in the same room.
 * 
 * @param {Array} users - List of merged user objects.
 * @param {number} proximity - Latitude/Longitude delta threshold (default 0.00015).
 * @returns {Array} List of groups: [{ position: [lat, lng], users: [...] }]
 */
export function groupUsersByLocation(users, proximity = 0.00015) {
  const groups = [];

  users.forEach((user) => {
    if (!user.position) return;

    /**
     * SEARCH: Look for an existing cluster nearby.
     * We use absolute delta rather than true radial distance for performance.
     */
    const nearbyGroup = groups.find(group => {
      const dLat = Math.abs(group.position[0] - user.position[0]);
      const dLng = Math.abs(group.position[1] - user.position[1]);
      return dLat < proximity && dLng < proximity;
    });

    if (nearbyGroup) {
      // Add user to existing cluster
      nearbyGroup.users.push(user);
    } else {
      // Create new cluster bucket
      groups.push({
        position: [...user.position], // Anchor point is the first user in the group
        users: [user],
      });
    }
  });

  return groups;
}

/**
 * CACHE: Stores Leaflet DivIcons to prevent recreating them on every map move.
 * Key: unique string representing the visual state.
 */
const iconCache = new Map();

/**
 * @function createCustomIcon
 * @description Generates a high-quality, dynamic SVG marker for a user or group.
 * 
 * FEATURES:
 * - SOS state: Adds a flashing red ring.
 * - Online state: Shows a green/red status dot.
 * - Group mode: Replaces avatar with a multi-person SVG and a count badge.
 * - Caching: Returns existing icons if the visual state hasn't changed.
 * 
 * @param {Object} data - Either a User object or a Group object.
 * @returns {L.DivIcon} The Leaflet icon ready for a <Marker />.
 */
export const createCustomIcon = (data) => {
  // 1. Identify context: Is this a group or a single individual?
  const isGroup = Array.isArray(data.users) && data.users.length > 1;
  const person = isGroup ? data.users[0] : (data.users ? data.users[0] : data);
  const count = isGroup ? data.users.length : 1;

  // 2. Logic Check: Status aggregation for groups
  const anyOnline = isGroup ? data.users.some(u => u.online && u.braceletOn) : (person.online && person.braceletOn);
  const anySos = isGroup ? data.users.some(u => u.sos) : person.sos;

  /**
   * 3. Performance: The Cache Key
   * If these 6 variables are identical, the icon is visually identical.
   */
  const cacheKey = `${isGroup}-${person.id}-${count}-${anyOnline}-${anySos}-${person.avatar}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  // 4. Group Visual (Generic SVG icon representing people)
  const groupIconSvg = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: #8b0000; margin-top: 2px;">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `;

  /**
   * 5. HTML Generation
   * Combines a background container (custom SVG) with dynamic internal layers.
   */
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

/**
 * @function isUserOnline
 * @description Compares a timestamp against the current clock to check for staleness.
 * 
 * @param {Date} lastSeen - The last time a packet was received from the device.
 * @param {number} thresholdMinutes - Max allowed age (default 1 minute).
 * @returns {boolean} True if the device is "Active".
 */
export function isUserOnline(lastSeen, thresholdMinutes = 1) {
  if (!lastSeen) return false;
  const now = new Date().getTime();
  const past = lastSeen.getTime();
  
  // Example: (10:05:30 - 10:05:00) < 60,000ms => true.
  return now - past < thresholdMinutes * 60 * 1000;
}

