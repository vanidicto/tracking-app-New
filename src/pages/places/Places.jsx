// src/pages/app/Places.jsx

import { MapContainer, TileLayer, FeatureGroup, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Monkey-patch Leaflet Draw Circle resize bug
// This fixes the "ReferenceError: radius is not defined" in strict mode
if (L.Edit && L.Edit.Circle) {
  L.Edit.Circle.prototype._resize = function (latlng) {
    var moveLatLng = this._moveMarker.getLatLng();
    var radius; // Correctly declare radius variable

    if (L.GeometryUtil.isVersion07x()) {
      radius = moveLatLng.distanceTo(latlng);
    } else {
      radius = this._map.distance(moveLatLng, latlng);
    }
    this._shape.setRadius(radius);

    if (this._map._editTooltip) {
      this._map._editTooltip.updateContent({
        text:
          L.drawLocal.edit.handlers.edit.tooltip.subtext +
          "<br />" +
          L.drawLocal.edit.handlers.edit.tooltip.text,
        subtext:
          L.drawLocal.draw.handlers.circle.radius +
          ": " +
          L.GeometryUtil.readableDistance(
            radius,
            true,
            this.options.feet,
            this.options.nautic
          ),
      });
    }

    this._shape.setRadius(radius);
    this._map.fire(L.Draw.Event.EDITRESIZE, { layer: this._shape });
  };
}
import "./Places.css";
import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

import * as mapHelpers from "../../utils/mapHelpers";
import { useBraceletUsers } from "../../context/BraceletDataProvider";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebaseConfig";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
// import LoadingSpinner from "../../components/LoadingSpinner";
import { Layers, X, ShieldCheck, Loader2, CheckCircle2, Pencil } from "lucide-react";
import MapLoader from "../../components/loading/MapLoader";

// New decoupled modules
import * as geofenceService from "../../services/geofenceService";
import * as geofenceUtils from "../../utils/geofenceUtils";
import * as notificationService from "../../services/notificationService";
import GeofenceGradient from "../../components/map/GeofenceGradient";

// Initialize Leaflet icons (Boilerplate moved to mapHelpers)
mapHelpers.setupLeafletIcons();

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
  const { braceletUsers, loading, addressCache, mapViewState, setMapViewState } = useBraceletUsers();

  // Address cache for popup location display
  const [activeAlerts, setActiveAlerts] = useState([]);

  const groupedMarkers = useMemo(() => {
    return mapHelpers.groupUsersByLocation(braceletUsers);
  }, [braceletUsers]);

  // List of geofences fetched from Firestore
  const [geofences, setGeofences] = useState([]);

  // State to toggle the Monitor Popup
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  // State for the fancy saving/success overlay after the form is submitted
  const [showSuccess, setShowSuccess] = useState(false);

  // States for the Rename Modal
  const [renamingZone, setRenamingZone] = useState(null); // Stores the zone object being renamed
  const [newZoneName, setNewZoneName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);


  /**
   * Effect: Invalidates map size when the map instance is ready.
   * This is a workaround for Leaflet rendering issues where the map might not
   * occupy the full container until a resize occurs.
   * Includes safety checks for component unmounts and hot reloads.
   */
  useEffect(() => {
    let timeoutId;
    if (map) {
      timeoutId = setTimeout(() => {
        // Ensure map and its DOM container still exist before forcing a resize
        if (map && map._container) {
          map.invalidateSize();
        }
      }, 200);
    }

    // Cleanup timeout if component unmounts before it fires
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
  const [zoneNameError, setZoneNameError] = useState("");
  // Local loading state while saving to Firestore
  const [isSaving, setIsSaving] = useState(false);
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
   * Memoized geofence transition calculations.
   * Only recalculates when braceletUsers or geofences actually change.
   */
  const geofenceResult = useMemo(
    () => geofenceUtils.checkGeofenceTransitions(
      braceletUsers,
      geofences,
      alertedUsersRef.current
    ),
    [braceletUsers, geofences]
  );

  /**
   * Effect: Process geofence side-effects from memoized result.
   */
  useEffect(() => {
    const { currentAlerts, newlyDetected, usersToUpdateOffline } = geofenceResult;

    setActiveAlerts(currentAlerts);

    // Update statuses for users who left their zones
    usersToUpdateOffline.forEach(status => {
      updateDoc(doc(db, 'deviceStatus', status.id), { currentGeofenceId: null })
        .catch(e => console.error("Error clearing geofence status", e));
    });

    // Save notifications for entries
    if (newlyDetected.length > 0) {
      newlyDetected.forEach(det => notificationService.saveGeofenceNotification(currentUser, det));
    }
  }, [geofenceResult, currentUser]);

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
      // Close the sidebar immediately after navigating
      setIsMonitorOpen(false);
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
   */
  const _onEdited = (e) => {
    e.layers.eachLayer(async (layer) => {
      const id = layer.options.id;
      if (!id) return;
      try {
        await geofenceService.updateGeofence(id, layer.getLatLng(), layer.getRadius());
      } catch (err) {
        console.error("Error updating geofence:", err);
      }
    });
  };

  /**
   * Callback for when layers are deleted from the map via the UI.
   */
  const _onDeleted = (e) => {
    e.layers.eachLayer(async (layer) => {
      try {
        await geofenceService.deleteGeofence(layer.options.id || layer._leaflet_id);
      } catch (err) {
        console.error("Error deleting geofence:", err);
      }
    });
  };

  /**
   * Opens the Rename Modal for a specific geofence.
   */
  const handleRename = (e, zone) => {
    e.stopPropagation(); // Prevent clicking the row
    setRenamingZone(zone);
    setNewZoneName(zone.name);
    setRenameError("");
  };

  /**
   * Submits the new name to Firestore.
   */
  const confirmRename = async () => {
    if (!newZoneName.trim()) {
      setRenameError("Please enter a name.");
      return;
    }
    if (newZoneName.trim() === renamingZone.name) {
      setRenamingZone(null);
      return;
    }

    setIsRenaming(true);
    try {
      await geofenceService.renameGeofence(renamingZone.id, newZoneName.trim());
      setRenamingZone(null);
    } catch (err) {
      console.error("Error renaming geofence:", err);
      alert("Failed to rename zone.");
    } finally {
      setIsRenaming(false);
    }
  };

  /**
   * Saves the newly drawn zone to the database.
   */
  const handleSaveZone = async () => {
    if (!zoneName.trim()) {
      setZoneNameError("Please enter a name for this zone.");
      return;
    }
    setZoneNameError("");
    if (!zoneName || !pendingLayerRef.current || !currentUser) return;

    setIsSaving(true);
    const layer = pendingLayerRef.current;

    // Close the monitor sidebar immediately so the user can see the field/overlay
    setIsMonitorOpen(false);

    try {
      await geofenceService.saveGeofence(currentUser, zoneName, layer.getLatLng(), layer.getRadius());
      layer.remove();
      setPendingLayerId(null);
      setZoneName("");
      pendingLayerRef.current = null;

      // Show success screen
      setShowSuccess(true);
    } catch (err) {
      console.error("Error saving geofence:", err);
      alert("Failed to save zone.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancels the current drawing operation and discards the unsaved layer.
   */
  const handleCancel = () => {
    if (pendingLayerRef.current) pendingLayerRef.current.remove();
    setPendingLayerId(null);
    setZoneName("");
    setZoneNameError("");
    pendingLayerRef.current = null;
    setIsMonitorOpen(false);
    setShowSuccess(false);
  };

  // if (loading) return <LoadingSpinner />;


  if (loading) {
    return (
      <div className="home-layout" style={{ position: 'relative' }}>
        <MapLoader text="Syncing Safety Zones..." fullScreen={true} lightTheme={false} />
      </div>
    );
  }
  // Determine the default center of the map based on the first active user position
  const initialCenterUser = braceletUsers.find(u => u.position && u.position.length === 2);
  const initialCenter = initialCenterUser ? initialCenterUser.position : [14.5921, 120.9755];



  return (
    <div className="places-page-container">
      <GeofenceGradient />
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
                <strong>Boundary Hit!⚠️</strong>
                <p><b>{activeAlerts[0]}</b> entered <b><i>{activeAlerts[1]}</i></b></p>
              </div>
            )}

            {/* Form shown only when a user is in the middle of creating/drawing a new zone */}
            {pendingLayerId !== null ? (
              <div className="save-zone-form">
                <h3>New Safe Zone</h3>
                <input
                  type="text"
                  className={`zone-name-input ${zoneNameError ? 'input-error' : ''}`}
                  value={zoneName}
                  onChange={(e) => {
                    setZoneName(e.target.value);
                    if (zoneNameError) setZoneNameError("");
                  }}
                  placeholder="e.g. Home / School"
                  required
                />
                {zoneNameError && (
                  <span className="error-text" style={{ color: '#c9302c', fontSize: '12px', marginTop: '-8px', marginBottom: '8px', display: 'block' }}>
                    {zoneNameError}
                  </span>
                )}
                <div className="form-buttons">
                  <button onClick={handleSaveZone} className="btn-save" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Zone"}
                  </button>
                  <button onClick={handleCancel} className="btn-cancel" disabled={isSaving}>
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
                    <div className="empty-geofence-state">
                      <div className="empty-icon-wrapper">
                        <ShieldCheck size={40} strokeWidth={1.5} />
                      </div>
                      <h4>No Zones Active</h4>
                      <p>Draw a circle on the map to define a safe boundary for your users.</p>
                    </div>
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
                            justifyContent: 'center',
                            color: 'var(--maroon)'
                          }}>
                            {/* Using a simple placeholder for icon, could import MapPin but mapHelpers uses it too */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          </div>
                          <span className="zone-name">{z.name}</span>
                        </div>
                        <div className="zone-meta-actions">
                          <span className="zone-radius-badge">{Math.round(z.radius)}m</span>
                          <button
                            className="btn-rename-ghost"
                            onClick={(e) => handleRename(e, z)}
                            title="Rename Zone"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
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
          center={mapViewState?.center || initialCenter}
          zoom={mapViewState?.zoom || 18}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", minHeight: "500px", width: "100%" }}
          whenReady={(m) => setMap(m.target)}
        >
          <MapStateTracker setMapViewState={setMapViewState} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Render real user markers dynamically from braceletUsers state */}
          {groupedMarkers.map((group, idx) => {
            const isGroup = group.users.length > 1;
            const singleUser = group.users[0];

            return (
              <Marker
                key={isGroup ? `group-${idx}` : singleUser.id}
                position={group.position}
                icon={mapHelpers.createCustomIcon(group)}
              >
                <Popup className="custom-popup" autoPan={false}>
                  <div className="popup-layout">
                    {isGroup ? (
                      <>
                        <div className="popup-group-header">
                          <p>{group.users.length} Users at this location</p>
                        </div>
                        <div className="popup-user-list">
                          {group.users.map((user) => (
                            <Link
                              key={user.id}
                              to={`/app/userProfile/${user.id}`}
                              state={{ personData: user }}
                              className="popup-user-item"
                            >
                              <img src={user.avatar} alt={user.name} className="popup-user-avatar" />
                              <div className="popup-user-info">
                                <span className="popup-user-name">{user.name}</span>
                                <div className="popup-user-meta">
                                  <span>{user.battery}% Battery</span> • 
                                  <span style={{ color: user.online ? '#34A853' : '#666', marginLeft: '4px' }}>
                                    {user.online ? 'Active' : 'Offline'}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="popup-header">
                          <h3>{singleUser.name}</h3>
                        </div>

                        <div className="popup-details">
                          <div className="detail-row">
                            <span>Bracelet Status</span>
                            <span className={`status-val ${singleUser.online ? "active" : "inactive"}`}>
                              {singleUser.online ? "Active" : "Offline"}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>Battery</span>
                            <span>{singleUser.battery}%</span>
                          </div>
                          <div className="detail-row">
                            <span>Last Seen</span>
                            <span>
                              {singleUser.lastSeen
                                ? (singleUser.lastSeen.toLocaleTimeString ? singleUser.lastSeen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "—")
                                : "—"}
                            </span>
                          </div>
                          {singleUser.sos?.active && (
                            <div className="detail-row">
                              <span style={{ color: 'red', fontWeight: 'bold' }}>SOS Status</span>
                              <span style={{ color: 'red', fontWeight: 'bold' }}>🚨 Active!</span>
                            </div>
                          )}
                        </div>

                        <div className="popup-location-box">
                          <p>{addressCache[singleUser.id] || "Fetching location…"}</p>
                        </div>

                        <div className="popup-footer">
                          <Link
                            to={`/app/userProfile/${singleUser.id}`}
                            state={{ personData: singleUser }}
                            className="profile-link"
                          >
                            View User Profile
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Leaflet Draw functionality group */}
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              key={`edit-control-${geofences.length}-${isMonitorOpen}`}
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
                circle: { shapeOptions: { stroke: true, color: "#A4262C", weight: 2, opacity: 0.5, fillColor: "url(#geofenceGradient)", fillOpacity: 0.5 } }, // Red boundary for safety zones
              }}
              edit={{
                edit: {
                  selectedPathOptions: {
                    stroke: true,
                    color: "#A4262C",
                    weight: 2,
                    opacity: 0.5,
                    fillColor: "url(#geofenceGradient)",
                    fillOpacity: 0.6,
                    maintainColor: true,
                  }
                },
                remove: {},
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
                  stroke: false,
                  fillColor: "url(#geofenceGradient)",
                  fillOpacity: 1,
                }}
              />
            ))}
          </FeatureGroup>
        </MapContainer>
      </div>

      {/* Fancy Save/Success Overlay */}
      {(isSaving || showSuccess) && (
        <div
          className="save-status-overlay"
          onClick={showSuccess ? () => setShowSuccess(false) : undefined}
        >
          <div className={`status-card ${isSaving ? 'is-loading' : ''} ${showSuccess ? 'is-success' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="status-content loading-state">
              <div className="loader-wrapper">
                <div className="pulse-ring"></div>
                <Loader2 className="spinner-icon-large" size={48} />
              </div>
              <h3>Securing Boundary</h3>
              <p>Registering your safe zone with the safety grid...</p>
            </div>

            <div className="status-content success-state">
              <div className="checkmark-wrapper">
                <CheckCircle2 className="checkmark-icon" size={64} />
              </div>
              <h3>Zone Activated!</h3>
              <p>Safety zone <strong>{zoneName}</strong> is now live.</p>
              <button
                className="btn-ok"
                onClick={() => setShowSuccess(false)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Geofence Modal */}
      {renamingZone && (
        <div className="rename-modal-overlay" onClick={() => !isRenaming && setRenamingZone(null)}>
          <div className="rename-card" onClick={(e) => e.stopPropagation()}>
            <div className="rename-header">
              <h3>Rename Zone</h3>
              <button
                className="close-rename-btn"
                onClick={() => setRenamingZone(null)}
                disabled={isRenaming}
              >
                <X size={20} />
              </button>
            </div>

            <div className="rename-body">
              <p>Update the identification for this boundary.</p>
              <input
                type="text"
                className={`rename-input ${renameError ? 'input-error' : ''}`}
                value={newZoneName}
                onChange={(e) => {
                  setNewZoneName(e.target.value);
                  if (renameError) setRenameError("");
                }}
                placeholder="Zone Name"
                autoFocus
                disabled={isRenaming}
              />
              {renameError && <span className="rename-error-text">{renameError}</span>}
            </div>

            <div className="rename-actions">
              <button
                className="btn-save-rename"
                onClick={confirmRename}
                disabled={isRenaming}
              >
                {isRenaming ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} />
                    Updating...
                  </>
                ) : "Save Changes"}
              </button>
              <button
                className="btn-cancel-rename"
                onClick={() => setRenamingZone(null)}
                disabled={isRenaming}
              >
                Keep Current
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component to explicitly track map moves and sync to Context
function MapStateTracker({ setMapViewState }) {
  const map = useMapEvents({
    moveend: () => {
      if (setMapViewState) {
        setMapViewState(prev => {
          const newLat = map.getCenter().lat;
          const newLng = map.getCenter().lng;
          const newZoom = map.getZoom();
          
          if (
            prev &&
            prev.zoom === newZoom &&
            Math.abs(prev.center[0] - newLat) < 0.00001 &&
            Math.abs(prev.center[1] - newLng) < 0.00001
          ) {
            return prev;
          }
          
          return { center: [newLat, newLng], zoom: newZoom };
        });
      }
    }
  });
  return null;
}

export default Places;
