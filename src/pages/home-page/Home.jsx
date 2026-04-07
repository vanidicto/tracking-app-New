import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./Home.css";
import { Link } from "react-router-dom";
import * as mapHelpers from "../../utils/mapHelpers";
import { useBraceletUsers } from "../../context/BraceletDataProvider";
import LoadingSpinner from "../../components/LoadingSpinner";
import MapLoader from "../../components/loading/MapLoader";
import HomeSidePanel from "../../components/HomeSidePanel";

function Home() {
  const { braceletUsers, loading, addressCache, mapViewState, setMapViewState } = useBraceletUsers();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | online | sos
  const [selectedId, setSelectedId] = useState(null);

  const mapRef = useRef(null);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = braceletUsers || [];

    if (filter === "online") list = list.filter((u) => u.online);
    if (filter === "sos") list = list.filter((u) => u.sos);

    if (q) list = list.filter((u) => (u.name || "").toLowerCase().includes(q));

    // Sort: SOS first, then online, then name
    list = [...list].sort((a, b) => {
      const aScore = (a.sos ? 2 : 0) + (a.online ? 1 : 0);
      const bScore = (b.sos ? 2 : 0) + (b.online ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return (a.name || "").localeCompare(b.name || "");
    });

    return list;
  }, [braceletUsers, query, filter]);

  const groupedMarkers = useMemo(() => {
    return mapHelpers.groupUsersByLocation(braceletUsers);
  }, [braceletUsers]);

  const getInitialCenter = () => {
    // 1. Priority: Any user in SOS mode (even if marked offline, SOS takes precedence)
    const sosUser = braceletUsers.find((u) => u.sos && u.position);
    if (sosUser?.position) return sosUser.position;

    const onlineUser = braceletUsers.find((u) => u.online && u.position);
    if (onlineUser?.position) return onlineUser.position;

    const anyUser = braceletUsers.find(
      (u) =>
        Array.isArray(u.position) &&
        u.position.length === 2 &&
        !isNaN(u.position[0]) &&
        !isNaN(u.position[1])
    );
    if (anyUser?.position) return anyUser.position;

    // Default center (TUP Manila)
    return [14.5921, 120.9755];
  };

  // No initial flyTo anymore as requested - we rely on getInitialCenter() for the first render.
  // The map will directly mount at the SOS location if one exists.

  const handleSelectUser = (u) => {
    setSelectedId(u.id);
    if (u?.position && mapRef.current) {
      const [lat, lng] = u.position;
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
      }
    }
  };

  if (loading) {
    return (
      <div className="home-layout" style={{ position: 'relative' }}>
        <MapLoader text="Fetching Map Data..." fullScreen={true} />
      </div>
    );
  }

  return (
    <div className="home-layout">
      <div className="home-map">
        <MapContainer
          center={mapViewState?.center || getInitialCenter()}
          zoom={mapViewState?.zoom || 18}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <MapController mapRef={mapRef} setMapViewState={setMapViewState} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            keepBuffer={8}
          />

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
                                ? singleUser.lastSeen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                : "—"}
                            </span>
                          </div>
                          {singleUser.sos && (
                            <div className="detail-row">
                              <span style={{color: 'red', fontWeight: 'bold'}}>SOS Status</span>
                              <span style={{color: 'red', fontWeight: 'bold'}}>🚨 Active!</span>
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
        </MapContainer>
      </div>

      {/* Desktop right-side monitoring panel */}
      <HomeSidePanel
        users={filteredUsers}
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        selectedId={selectedId}
        onSelectUser={handleSelectUser}
        addressCache={addressCache}
      />
    </div>
  );
}

export default Home;

// Helper to access map instance and track pan/zoom state globally
function MapController({ mapRef, setMapViewState }) {
  const map = useMapEvents({
    moveend: () => {
      if (setMapViewState) {
        setMapViewState(prev => {
          const newLat = map.getCenter().lat;
          const newLng = map.getCenter().lng;
          const newZoom = map.getZoom();
          
          // Bail out if map hasn't actually moved (prevents infinite loop)
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

  useEffect(() => {
    mapRef.current = map;
    // Force resize to fix "blank map" issues
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map, mapRef]);
  return null;
}
