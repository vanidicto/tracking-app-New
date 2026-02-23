import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./Home.css";
import { Link } from "react-router-dom";
import * as mapHelpers from "../utils/mapHelpers";
import { reverseGeocode } from "../utils/geocode";
import { useBraceletUsers } from "../hooks/useUsers";
import LoadingSpinner from "../components/LoadingSpinner";
import HomeSidePanel from "../components/HomeSidePanel";

import L from "leaflet";

// Fix Leaflet's default icon path issues in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function Home() {
  const { braceletUsers, loading } = useBraceletUsers();

  const [addressCache, setAddressCache] = useState({});
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

  // Fetch addresses safely (not inside render)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      for (const u of filteredUsers) {
        if (cancelled) return;
        if (!u?.position || addressCache[u.id]) continue;

        const [lat, lng] = u.position || [];
        if (isNaN(lat) || isNaN(lng)) continue;
        // Skip default/null island coordinates
        if (lat === 0 && lng === 0) continue;

        setAddressCache((prev) => ({ ...prev, [u.id]: "Fetching location…" }));

        const addr = await reverseGeocode(lat, lng);

        if (cancelled) return;
        setAddressCache((prev) => ({
          ...prev,
          [u.id]: addr || "Address not found",
        }));

        // small spacing to avoid hammering API
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // NOTE: intentionally not including addressCache in deps to prevent loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUsers]);

  const getInitialCenter = () => {
    const sosUser = braceletUsers.find((u) => u.sos && u.online && u.position);
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

  const handleSelectUser = (u) => {
    setSelectedId(u.id);
    if (u?.position && mapRef.current) {
      const [lat, lng] = u.position;
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current.flyTo([lat, lng], 19, { duration: 0.8 });
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="home-layout">
      <div className="home-map">
        <MapContainer
          center={getInitialCenter()}
          zoom={15}
          style={{ height: "100%", minHeight: "500px", width: "100%" }}
        >
          <MapController mapRef={mapRef} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {braceletUsers.map((person) => (
            person.position ? (
              <Marker
                key={person.id}
                position={person.position}
                icon={mapHelpers.createCustomIcon(person)}
              >
                <Popup className="custom-popup">
                  <Link
                    to={`/app/userProfile/${person.id}`}
                    state={{ personData: person }}
                    className="popup-content"
                  >
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="popup-image"
                    />
                    <div className="popup-info">
                      <h3>{person.name}</h3>
                      <p>Battery: {person.battery}%</p>
                      <p>Status: {person.online ? "🟢 Online" : "🔴 Offline"}</p>
                      <p>Pulse: {person.pulseRate ?? "—"}</p>
                      <p>
                        Last Seen:{" "}
                        {person.lastSeen
                          ? person.lastSeen.toLocaleTimeString()
                          : "—"}
                      </p>
                      <p>Location: {addressCache[person.id] || "—"}</p>
                      {person.sos && <p className="sos">🚨 SOS Active!</p>}
                    </div>
                  </Link>
                </Popup>
              </Marker>
            ) : null
          ))}
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

// Helper to access map instance
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    // Force resize to fix "blank map" issues
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map, mapRef]);
  return null;
}
