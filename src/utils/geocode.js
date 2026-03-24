// src/utils/geocode.js
// Reverse geocoding using Nominatim (OpenStreetMap) via Vite dev-server proxy.
// The proxy completely bypasses browser CORS restrictions.

// In-memory cache: maps "lat,lng" → resolved address string
const geocodeCache = new Map();

// Promise queue: ensures requests are sent one at a time with spacing
let requestQueue = Promise.resolve();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reverse geocode coordinates into a human-readable address.
 * Uses a Vite dev-server proxy (/api/nominatim) to talk to Nominatim
 * server-to-server, completely avoiding browser CORS restrictions.
 * 
 * Includes:
 * - Promise-level caching (deduplicates concurrent calls for the same location)
 * - Sequential queue with 1.1s delay (respects Nominatim's 1 req/sec limit)
 */
export async function reverseGeocode(lat, lng) {
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  
  // Return cached promise (pending or resolved) if it exists
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const fetchPromise = new Promise((resolve) => {
    requestQueue = requestQueue.then(async () => {
      try {
        // Respect Nominatim's strict 1 request/second rate limit
        await delay(1100);
        
        // This hits YOUR Vite dev server, which proxies it to Nominatim server-to-server.
        // No CORS involved because the browser thinks it's a same-origin request.
        const url = `/api/nominatim/reverse?format=jsonv2&lat=${lat}&lon=${lng}&email=tracking-app@example.com`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Nominatim HTTP ${response.status}`);
        }
        
        const data = await response.json();
        resolve(data.display_name || 'Address not found');
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        resolve(null);
      }
    });
  });

  // Cache the promise immediately so concurrent callers share one fetch
  geocodeCache.set(cacheKey, fetchPromise);
  return fetchPromise;
}
