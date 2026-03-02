// src/utils/geocode.js
// Utility for reverse geocoding using Nominatim (OpenStreetMap)

export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'tracking-app/1.0 (your@email.com)'
      }
    });
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    return data.display_name || null;
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}
