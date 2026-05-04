// src/pages/app/UserProfile.jsx
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Battery, MapPin, Clock, Navigation } from 'lucide-react';
import './UserProfile.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import { createCustomIcon } from '../../utils/mapHelpers';
import { useBraceletUsers } from '../../context/BraceletDataProvider';
import { useLocationHistory } from '../../hooks/useLocationHistory';

// Fix for Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Helper: force Leaflet to recalculate its container size after tab switch ──
const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
};

// ── Helper: re-fit the history map bounds whenever positions change ──
function HistoryMapController({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 17, { animate: false });
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18, animate: false });
    }
  }, [positions, map]);
  return null;
}

// ── Sub-component: Live Location map ──
function LiveLocationView({ person, address }) {
  const userPosition =
    person?.position && Array.isArray(person.position)
      ? person.position
      : [14.5995, 120.9842];

  return (
    <div className="up-map-section">
      <div className="up-map-header">
        <h3 className="up-map-title">Live Location</h3>
        <div className="up-map-coords">
          {userPosition[0].toFixed(6)}, {userPosition[1].toFixed(6)}
        </div>
      </div>
      <div className="up-map-container">
        <MapContainer
          attributionControl={false}
          center={userPosition}
          zoom={18}
          style={{ width: '100%', height: '100%' }}
        >
          <ResizeMap />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={userPosition} icon={createCustomIcon(person)}>
            <Popup className="custom-popup">
              <div className="popup-layout">
                <div className="popup-header">
                  <h3>{person?.name}</h3>
                </div>
                <div className="popup-location-box">
                  <p>{address}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}

// ── Sub-component: History Trail map + scrollable list ──
function HistoryTrailView({ history, loading, person }) {
  const MAP_MAX_HEIGHT = 220;
  const [mapHeight, setMapHeight] = useState(MAP_MAX_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDragging: false, startY: 0, startHeight: 0 });

  const handleDragStart = (e) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = {
      isDragging: true,
      startY: clientY,
      startHeight: mapHeight
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState.current.isDragging) return;
      
      // Prevent page scrolling while dragging the drawer
      if (e.cancelable) e.preventDefault();
      
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragState.current.startY;
      
      let newHeight = dragState.current.startHeight + deltaY;
      newHeight = Math.max(0, Math.min(MAP_MAX_HEIGHT, newHeight));
      
      setMapHeight(newHeight);
    };

    const handleEnd = () => {
      if (!dragState.current.isDragging) return;
      dragState.current.isDragging = false;
      setIsDragging(false);
      
      // Snap to open/closed state
      setMapHeight(currentHeight => {
        return currentHeight < MAP_MAX_HEIGHT / 2 ? 0 : MAP_MAX_HEIGHT;
      });
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging]);

  if (loading) {
    return (
      <div className="up-history-loading">
        <div className="up-history-spinner" />
        <p>Loading trail…</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="up-history-empty">
        <Navigation size={48} strokeWidth={1.2} className="up-history-empty-icon" />
        <p className="up-history-empty-title">No trail yet</p>
        <p className="up-history-empty-sub">
          History will appear once the bracelet starts moving.
        </p>
      </div>
    );
  }

  // history is most-recent-first; reverse for the polyline (oldest → newest)
  const chronological = [...history].reverse();
  const positions = chronological.map((h) => [h.lat, h.lng]);
  const newestIdx = positions.length - 1;

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    return isToday
      ? 'Today'
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="up-history-section">
      {/* ── MAP ── */}
      <div 
        className="up-history-map-wrapper"
        style={{
          height: `${mapHeight}px`,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderBottom: mapHeight === 0 ? 'none' : '1px solid #e0e0e0'
        }}
      >
        <MapContainer
          attributionControl={false}
          center={positions[newestIdx]}
          zoom={16}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <ResizeMap />
          <HistoryMapController positions={positions} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Dashed trail polyline: oldest → newest */}
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#8b0000',
              weight: 2,
              dashArray: '5, 10',
              opacity: 0.6,
            }}
          />

          {/* Numbered circle markers and Current Avatar */}
          {chronological.map((entry, idx) => {
            const isNewest = idx === newestIdx;
            
            if (isNewest) {
              return (
                <Marker 
                  key={entry.id} 
                  position={[entry.lat, entry.lng]} 
                  icon={createCustomIcon(person)}
                  zIndexOffset={1000}
                >
                  <Popup className="custom-popup">
                    <div className="popup-layout">
                      <div className="popup-header">
                        <h3>{person?.name}</h3>
                      </div>
                      <div className="popup-location-box">
                        <p>Current Trail Stop</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            return (
              <CircleMarker
                key={entry.id}
                center={[entry.lat, entry.lng]}
                radius={4}
                pathOptions={{
                  color: '#888',
                  fillColor: '#fff',
                  fillOpacity: 1,
                  weight: 1.5,
                }}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -5]}
                  className="up-history-tooltip"
                >
                  {idx + 1}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── DRAG HEADER ── */}
      <div 
        className="up-history-list-header" 
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
      >
        <div 
          className="up-history-drag-handle" 
          style={{ backgroundColor: mapHeight === 0 ? '#ccc' : '#e0e0e0' }} 
        />
        <div className="up-history-header-content">
          <span className="up-history-list-title">
            {history.length} {history.length === 1 ? 'Stop' : 'Stops'} Recorded
          </span>
          <span className="up-history-list-hint">Most recent first</span>
        </div>
      </div>

      {/* ── SCROLLABLE LIST ── */}
      <div className="up-history-list">
        {history.map((entry, idx) => {
          const stopNum = history.length - idx;
          const isNewest = idx === 0;

          return (
            <div
              key={entry.id}
              className={`up-history-item${isNewest ? ' up-history-item--newest' : ''}`}
            >
              <div className="up-history-index">{stopNum}</div>

              <div className="up-history-info">
                <div className="up-history-coords">
                  <MapPin size={11} className="up-history-coord-icon" />
                  {entry.lat.toFixed(6)}, {entry.lng.toFixed(6)}
                </div>
                <div className="up-history-meta">
                  <Clock size={11} className="up-history-meta-icon" />
                  <span className="up-history-date">{formatDate(entry.timestampDate)}</span>
                  <span className="up-history-time">{formatTime(entry.timestampDate)}</span>
                </div>
              </div>

              {entry.battery != null && (
                <div className="up-history-battery">
                  <Battery
                    size={12}
                    className={
                      entry.battery < 30
                        ? 'up-history-bat-low'
                        : entry.battery < 60
                        ? 'up-history-bat-mid'
                        : 'up-history-bat-ok'
                    }
                  />
                  <span
                    className={
                      entry.battery < 30
                        ? 'up-history-bat-low'
                        : entry.battery < 60
                        ? 'up-history-bat-mid'
                        : 'up-history-bat-ok'
                    }
                  >
                    {entry.battery}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──
const UserProfile = () => {
  const location = useLocation();
  const { userId } = useParams();

  const { braceletUsers, addressCache, fetchAddress } = useBraceletUsers();

  const targetId = location.state?.personData?.id || userId;
  const person = braceletUsers?.find((u) => u.id === targetId) || location.state?.personData;

  const [activeTab, setActiveTab] = useState('live');

  // Lazy subscription — only fetches when History tab is open
  const { history, loading: historyLoading } = useLocationHistory(
    activeTab === 'history' ? person?.id : null
  );

  // Request geocode if not already cached
  useEffect(() => {
    if (person?.position && person?.id && !addressCache[person.id]) {
      fetchAddress(person.id, person.position[0], person.position[1]);
    }
  }, [person?.position, person?.id, addressCache, fetchAddress]);

  if (!person) {
    return (
      <div className="up-page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#888', fontSize: '1rem', fontWeight: 500 }}>Loading profile...</p>
      </div>
    );
  }

  const address = addressCache[person?.id] || 'Fetching location…';

  const getBatteryColor = (level) => {
    if (level < 30) return 'red-text';
    if (level < 60) return 'orange-text';
    return 'green-text';
  };
  const batteryColorClass = getBatteryColor(person?.battery || 0);

  const formatLastSeen = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="up-page-container">
      <div className="up-content-grid">

        {/* ROW 1: Avatar (Left) & Details (Right) */}
        <div className="up-top-row">
          <div className="left-section">
            <div className="up-avatar-wrapper">
              <img src={person?.avatar} alt={person?.name} className="up-avatar-img" />
            </div>
            <div className="up-identity-row">
              <h2 className="up-name">{person?.name.split(' ')[0]}</h2>
            </div>
          </div>
          <div className="up-details-box">
            <div className="up-detail-line">
              <span className="up-detail-label">Serial Number</span>
              <span className="up-detail-value">{person?.serialNumber || 'N/A'}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Emergency Name.</span>
              <span className="up-detail-value">{person?.emergencyContacts?.[0]?.name || 'N/A'}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Emergency No.</span>
              <span className="up-detail-value">{person?.emergencyContacts?.[0]?.contactNo || 'N/A'}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Last Seen</span>
              <span className="up-detail-value">{formatLastSeen(person?.lastSeen)}</span>
            </div>
          </div>
        </div>

        {/* ROW 2: Battery & Bracelet Status */}
        <div className="up-status-bar">
          <div className="up-status-item">
            <Battery size={16} className={`up-icon ${batteryColorClass.split('-')[0]}`} />
            <span className="up-status-label">Battery:</span>
            <span className={`up-status-value ${batteryColorClass.split('-')[0]}`}>
              {person?.battery || 0}%
            </span>
          </div>
          <div className="up-status-divider" />
          <div className="up-status-item">
            <span className="up-status-label">Bracelet:</span>
            <span className={`up-status-value ${person?.braceletOn ? 'success' : 'danger'}`}>
              {person?.braceletOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="up-tab-bar">
          <button
            id="tab-live-location"
            className={`up-tab${activeTab === 'live' ? ' up-tab--active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            Live Location
          </button>
          <button
            id="tab-history-trail"
            className={`up-tab${activeTab === 'history' ? ' up-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History Trail
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'live' ? (
          <LiveLocationView person={person} address={address} />
        ) : (
          <HistoryTrailView history={history} loading={historyLoading} person={person} />
        )}

      </div>
    </div>
  );
};

export default UserProfile;
