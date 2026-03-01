// src/pages/app/Places.jsx

import { MapContainer, TileLayer, FeatureGroup, Marker, Popup, Circle, } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "./Places.css";
import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import * as mapHelpers from "../../utils/mapHelpers";
import { useBraceletUsers } from "../../hooks/useUsers";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, onSnapshot, deleteDoc, updateDoc, doc, setDoc } from "firebase/firestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Layers, X } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Notifications are saved to Firestore `notifications` collection

/* ---------------------- Helpers ---------------------- */

/**
 * Places Component
 * 
 * This component provides a Map-based interface for monitoring geofences (safe zones).
 * It allows the user to:
 * 1. View real-time locations of "bracelet users" on a map.
 * 2. Create new circular geofences using a drawing tool.
 * 3. Edit or delete existing geofences.
 * 4. Monitor if users enter/leave these geofences and trigger Firestore-based notifications.
 * 
 * @returns {JSX.Element} The rendered geofence monitoring page.
 */
const Places = () => {
  // Leaflet map instance state
  const [map, setMap] = useState(null);

  // Custom hook to fetch bracelet users and their positions
  const { braceletUsers, loading } = useBraceletUsers();

  // List of active geofence alert messages for local display
  const [activeAlerts, setActiveAlerts] = useState([]);

  // List of geofences fetched from Firestore
  const [geofences, setGeofences] = useState([]);

  // State to toggle the Monitor Popup
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);

  /**
   * Effect: Invalidates map size when the map instance is ready.
   * This is a workaround for Leaflet rendering issues where the map might not
   * occupy the full container until a resize occurs.
   */
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [map]);

  /**
   * Effect: Scroll Lock
   * Prevents the whole page from scrolling when the map is active.
   */
  useEffect(() => {
    // Save original overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;
    // Lock scroll
    document.body.style.overflow = 'hidden';

    // Cleanup: Restore overflow on unmount
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // State for the name of a new zone being created
  const [zoneName, setZoneName] = useState("");
  // Leaflet ID of a temporary layer being drawn but not yet saved
  const [pendingLayerId, setPendingLayerId] = useState(null);

  // Refs for tracking map group and temporary drawing layers
  const featureGroupRef = useRef(null);
  const pendingLayerRef = useRef(null);

  // Ref to debounce/cache alerts locally to avoid spamming Firestore
  const alertedUsersRef = useRef(new Set());

  // Auth context for the current logged-in user (the monitor/app user)
  const { currentUser } = useAuth();

  /**
   * Effect: Fetches and syncs geofences from Firestore.
   * Filters by the current user's UID and updates the local state in real-time.
   */
  useEffect(() => {
    if (!currentUser) {
      setGeofences([]);
      return;
    }

    const q = query(
      collection(db, "geofences"),
      where("appUserId", "==", currentUser.uid)
    );

    // Set up a real-time listener for the geofences collection
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedZones = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          appUserName: currentUser.displayName,
          id: doc.id,
          name: data.name,
          radius: data.radius,
          latlngs: data.coordinates, // Store coordinates {lat, lng}
          type: data.type,
        };
      });
      setGeofences(fetchedZones);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /**
   * Effect: Geofence Monitoring Logic.
   * This effect runs whenever bracelet users or geofences update.
   * It calculates the distance between each user and each geofence.
   */
  useEffect(() => {
    const currentAlerts = [];
    const newlyDetected = [];


    braceletUsers.forEach((user) => {
      // Ensure user has a valid position array [lat, lng]
      if (!Array.isArray(user.position) || user.position.length !== 2) return;

      const userLatLng = L.latLng(user.position[0], user.position[1]);
      let insideZoneId = null;
      let insideZoneName = null;

      // Iterate through all geofences to check if user is inside
      for (const zone of geofences) {
        if (!zone.latlngs) continue;
        const circleCenter = L.latLng(zone.latlngs.lat, zone.latlngs.lng);
        const distance = userLatLng.distanceTo(circleCenter);

        // Small buffer for visual overlap
        const avatarVisualRadius = 10;

        // If distance is less than or equal to radius + buffer, user is "inside"
        if (distance <= zone.radius + avatarVisualRadius) {
          insideZoneId = zone.id;
          insideZoneName = zone.name;

          const alertMessage = `${user.name} entered ${zone.name}`;
          currentAlerts.push(alertMessage);
          break; // Stop checking other zones for this user once inside one
        }
      }

      /* --- Logic for State Transition (Entry/Exit) --- */
      if (insideZoneId) {
        // User is currently inside a zone
        if (user.currentGeofenceId !== insideZoneId) {
          // They just entered this zone (or moved from another)
          const alertMessage = `${user.name} entered ${insideZoneName}`;
          const alertKey = `${user.id}-${insideZoneId}`;

          // Local debounce check to prevent multi-writing before state syncs
          if (!alertedUsersRef.current.has(alertKey)) {
            alertedUsersRef.current.add(alertKey);
            newlyDetected.push({ user, zone: { id: insideZoneId, name: insideZoneName }, message: alertMessage });
          }
        }
      } else {
        // User is NOT inside any zone
        if (user.currentGeofenceId && user.deviceStatusId) {
          // Transition: They just left their previous zone -> Clear status in Firestore
          updateDoc(doc(db, 'deviceStatus', user.deviceStatusId), { currentGeofenceId: null })
            .catch(e => console.error("Error clearing geofence status", e));
        }
      }
    });

    /**
     * Async block to save newly detected "Entries" as notifications in Firestore.
     */
    if (newlyDetected.length > 0) {
      (async () => {
        try {
          if (!currentUser) return;

          for (const det of newlyDetected) {
            const { user, zone, message } = det;

            // Optional: Prevent exact duplicate notifications from flooding
            const dupQ = query(
              collection(db, 'notifications'),
              where('appUserId', '==', currentUser.uid),
              where('braceletUserId', '==', user.id),
              where('message', '==', message),
              limit(1)
            );
            const dupSnap = await getDocs(dupQ);
            if (!dupSnap.empty) {
              continue; // Skip if a notification like this already exists
            }

            // Create a notification doc for the app user to see
            await addDoc(collection(db, 'notifications'), {
              appUserId: currentUser.uid,
              braceletUserId: user.id,
              title: 'Geofence Alert',
              message: message,
              read: false,
              type: 'Geofence',
              time: serverTimestamp(),
              icon: user.avatar || null,
            });

            // Update the user's status to reflect their current zone
            if (user.deviceStatusId) {
              await updateDoc(doc(db, 'deviceStatus', user.deviceStatusId), { currentGeofenceId: zone.id });
            }
          }
        } catch (err) {
          console.error('Failed saving geofence notifications:', err);
        }
      })();
    }

    setActiveAlerts(currentAlerts);
  }, [braceletUsers, geofences, currentUser]);

  /**
   * Centers and flies the map to a specific geofence when clicked in the list.
   * @param {Object} zone The geofence object.
   */
  const handleZoneClick = (zone) => {
    if (map && zone.latlngs) {
      map.flyTo([zone.latlngs.lat, zone.latlngs.lng], 18, {
        animate: true,
        duration: 1.5,
      });
    }
  };

  /**
   * Callback for when a new layer (circle) is finished being drawn on the map.
   * @param {Object} e Leaflet draw event.
   */
  const _onCreate = (e) => {
    const layer = e.layer;
    // Prevent drawing multiple pending zones at once
    if (pendingLayerId !== null) {
      layer.remove();
      return;
    }
    pendingLayerRef.current = layer;
    setPendingLayerId(layer._leaflet_id);
    setIsMonitorOpen(true); // Open the monitor to show the save form
  };

  /**
   * Callback for when existing layers are edited on the map via the UI.
   * Syncs changes (lat/lng/radius) back to Firestore.
   * @param {Object} e Leaflet draw event.
   */
  const _onEdited = async (e) => {
    e.layers.eachLayer(async (layer) => {
      const id = layer.options.id;
      if (!id) return;

      const newLatLng = layer.getLatLng();
      const newRadius = layer.getRadius();

      try {
        const zoneRef = doc(db, "geofences", id);
        await updateDoc(zoneRef, {
          coordinates: { lat: newLatLng.lat, lng: newLatLng.lng },
          radius: newRadius
        });
      } catch (err) {
        console.error("Error updating geofence:", err);
      }
    });
  };

  /**
   * Callback for when layers are deleted from the map via the UI.
   * Removes corresponding documents from Firestore.
   * @param {Object} e Leaflet draw event.
   */
  const _onDeleted = async (e) => {
    e.layers.eachLayer(async (layer) => {
      const id = layer.options.id || layer._leaflet_id;
      // Only delete if it's a saved zone (using its document ID)
      if (typeof id === 'string') {
        try {
          await deleteDoc(doc(db, "geofences", id));
        } catch (err) {
          console.error("Error deleting geofence:", err);
        }
      }
    });
  };

  /**
   * Saves the newly drawn zone to the database with the name entered in the form.
   */
  const handleSaveZone = async () => {
    if (!zoneName || !pendingLayerRef.current || !currentUser) return;
    const layer = pendingLayerRef.current;
    const latLng = layer.getLatLng();
    const radius = layer.getRadius();

    try {
      const newDocRef = doc(collection(db, "geofences"));
      await setDoc(newDocRef, {
        appUserName: currentUser.displayName,
        appUserId: currentUser.uid,
        coordinates: { lat: latLng.lat, lng: latLng.lng },
        id: newDocRef.id,
        name: zoneName,
        radius: radius,
        type: "circle"
      });

      layer.remove(); // Remove the temporary "drawn" layer from Leaflet
      setPendingLayerId(null);
      setZoneName("");
      pendingLayerRef.current = null;
      setIsMonitorOpen(false); // Close the monitor after saving
    } catch (err) {
      console.error("Error saving geofence:", err);
      alert("Failed to save zone.");
    }
  };

  /**
   * Cancels the current drawing operation and discards the unsaved layer.
   */
  const handleCancel = () => {
    if (pendingLayerRef.current) pendingLayerRef.current.remove();
    setPendingLayerId(null);
    setZoneName("");
    pendingLayerRef.current = null;
    setIsMonitorOpen(false); // Close the monitor after canceling
  };

  if (loading) return <LoadingSpinner />;


  // Determine the default center of the map based on the first active user position
  const initialCenterUser = braceletUsers.find(u => u.position && u.position.length === 2);
  const initialCenter = initialCenterUser ? initialCenterUser.position : [14.5921, 120.9755];



  return (
    <div className="places-page-container">
      {/* Floating Toggle Button */}
      <button
        className={`monitor-toggle-btn ${isMonitorOpen ? 'active' : ''}`}
        onClick={() => setIsMonitorOpen(!isMonitorOpen)}
        aria-label="Toggle Monitor"
      >
        {isMonitorOpen ? <X size={24} /> : <Layers size={24} />}
        {activeAlerts.length > 0 && !isMonitorOpen && (
          <span className="pulse-indicator" />
        )}
      </button>

      {/* Sidebar Panel for Alerts and Zone Management (Popup Version) */}
      {isMonitorOpen && (
        <div
          className="places-monitor-overlay"
          onClick={pendingLayerId === null ? () => setIsMonitorOpen(false) : undefined}
          style={{ cursor: pendingLayerId === null ? 'pointer' : 'default' }}
        >
          <div className="places-info-panel" onClick={(e) => e.stopPropagation()}>
            <div className="monitor-header">
              <h2>Geofence Monitor</h2>
              {pendingLayerId === null && (
                <button className="close-btn" onClick={() => setIsMonitorOpen(false)}>
                  <X size={20} />
                </button>
              )}
            </div>

            <p>Real-time boundary tracking and safety zone management.</p>

            {/* Display active "Hit" alerts (who is inside what zone right now) */}
            {activeAlerts.length > 0 && (
              <div className="alert-box">
                <strong>⚠️ Boundary Hit!</strong>
                <p>{activeAlerts.join(", ")}</p>
              </div>
            )}

            {/* Form shown only when a user is in the middle of creating/drawing a new zone */}
            {pendingLayerId !== null ? (
              <div className="save-zone-form">
                <h3>New Safe Zone</h3>
                <input
                  type="text"
                  className="zone-name-input"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Home / School"
                />
                <div className="form-buttons">
                  <button onClick={handleSaveZone} className="btn-save">
                    Save Zone
                  </button>
                  <button onClick={handleCancel} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* List of existing geofences */
              <div className="geofence-list">
                <h3>Active Zones</h3>
                <ul className="zone-items-list">
                  {geofences.length === 0 ? (
                    <p className="no-zones-text">No safe zones defined yet.</p>
                  ) : (
                    geofences.map((z) => (
                      <li
                        className="zone-item"
                        key={z.id}
                        onClick={() => handleZoneClick(z)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            background: 'rgba(164, 38, 44, 0.1)',
                            padding: '8px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {/* Using a simple placeholder for icon, could import MapPin but mapHelpers uses it too */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A4262C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          </div>
                          <span className="zone-name">{z.name}</span>
                        </div>
                        <span className="zone-type">{z.type}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Map View Module */}
      <div className="places-map-container">
        <MapContainer
          center={initialCenter}
          zoom={18}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", minHeight: "500px", width: "100%" }}
          whenReady={(m) => setMap(m.target)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Render real user markers dynamically from braceletUsers state */}
          {braceletUsers.map((user) =>
            user.position && (
              <Marker
                key={user.id}
                position={user.position}
                icon={mapHelpers.createCustomIcon(user)}
              >
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="popup-image"
                    />
                    <div className="popup-info">
                      <h3>{user.name}</h3>
                      <p>Battery: {user.battery}%</p>
                      <p>
                        Status: {user.online ? "🟢 Online" : "🔴 Offline"}
                      </p>
                      <p>Pulse: {user.pulseRate ?? "—"} BPM</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          )}

          {/* Leaflet Draw functionality group */}
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={_onCreate}
              onEdited={_onEdited}
              onDeleted={_onDeleted}
              draw={{
                polygon: false,
                rectangle: false,
                polyline: false,
                marker: false,
                circlemarker: false,
                circle: { shapeOptions: { color: "#aa262dff" } }, // Red boundary for safety zones
              }}
            />

            {/* Visualize saved geofences as semi-transparent red circles */}
            {geofences.map((zone) => (
              <Circle
                key={zone.id}
                id={zone.id}
                center={zone.latlngs}
                radius={zone.radius}
                pathOptions={{
                  color: "#A4262C",
                  fillColor: "#A4262C",
                  fillOpacity: 0.2,
                }}
              />
            ))}
          </FeatureGroup>
        </MapContainer>
      </div>
    </div>
  );
};

export default Places;
