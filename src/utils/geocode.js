/**
 * @file geocode.js
 * @summary Utility for converting GPS coordinates into human-readable street addresses.
 * 
 * DESIGN RATIONALE:
 * 1. OpenStreetMap (Nominatim) has a strict "1 request per second" fair use policy.
 * 2. Browser CORS restrictions prevent direct calls to Nominatim from the client.
 * 
 * SOLUTION:
 * - A sequential Promise queue ensures we never exceed the rate limit.
 * - A server-side proxy (via Vite dev server) bypasses CORS.
 */

/**
 * @constant geocodeCache
 * @description In-memory cache to avoid repeating expensive HTTP calls for the same location.
 * Maps "lat,lng" string (rounded to 4 decimals) to a Promise.
 */
const geocodeCache = new Map();

/**
 * @variable requestQueue
 * @description A sequential chain of Promises. Each new request is tacked onto the end 
 * of this chain using .then(), ensuring they execute one after another with valid spacing.
 */
let requestQueue = Promise.resolve();

/**
 * Simple delay helper for the queue.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @function reverseGeocode
 * @description The primary entry point for address resolution.
 * 
 * @param {number|string} lat - Latitude.
 * @param {number|string} lng - Longitude.
 * @returns {Promise<string|null>} The formatted address (e.g., "123 Main St, Manila") or null.
 * 
 * @example
 * const address = await reverseGeocode(14.5, 120.9);
 * // returns: "Rizal Park, Manila, Philippines"
 */
export async function reverseGeocode(lat, lng) {
  /**
   * KEY GENERATION:
   * We round to 4 decimal places (~11 meters precision). 
   * This ensures that small GPS jitters don't bust the cache unnecessarily.
   */
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  
  /**
   * CACHING LOGIC:
   * We cache the PROMISE itself, not just the result. 
   * Benefit: If 5 components request the same address simultaneously, only ONE network call happens.
   */
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const fetchPromise = new Promise((resolve) => {
    /**
     * QUEUE MANAGEMENT:
     * We wait for all previous requests to finish before starting this one.
     */
    requestQueue = requestQueue.then(async () => {
      try {
        /**
         * RATE LIMITING:
         * We wait 1.1s (100ms buffer) to respect OpenStreetMap's TOS.
         */
        await delay(1100);
        
        /**
         * THE PROXY STRATEGY:
         * We hit '/api/nominatim' which is intercepted by the Vite Dev Server (see vite.config.js).
         * Vite then forwards this request to OpenStreetMap from a server context.
         * To the browser, this looks like a same-origin request, thus bypassing CORS.
         */
        const url = `/api/nominatim/reverse?format=jsonv2&lat=${lat}&lon=${lng}&email=tracking-app@example.com`;
        const response = await fetch(url);
        
        // Edge Case: Service is down or rate limited (HTTP 429/500)
        if (!response.ok) {
          throw new Error(`Nominatim HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        /**
         * Fallback logic: Nominatim might return empty data for uninhabited areas.
         */
        resolve(data.display_name || 'Address not found');
      } catch (err) {
        console.error('SERVER-SIDE GEOCODING ERROR:', err);
        // We resolve null so the UI can show a fallback instead of crashing
        resolve(null);
      }
    });
  });

  // Save the promise to the map before returning
  geocodeCache.set(cacheKey, fetchPromise);
  return fetchPromise;
}
