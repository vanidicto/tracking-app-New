// src/pages/app/UserProfile.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Phone, Wifi, Battery, ChevronLeft } from 'lucide-react';
import './UserProfile.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { createCustomIcon } from '../utils/mapHelpers';

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

// ✅ Helper component to fix map rendering issue
const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map]);
  return null;
};

const UserProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const person = location.state?.personData;

  if (!person) {
    return <div>No user data provided! Please go back to the people list.</div>;
  }


  // LOGIC FIX: Use person.online for connection status. 
  // person.braceletOn is now synced with online status via useUsers hook.
  const isOnline = person.online;
  const isBraceletOn = person.braceletOn;
  const batteryLevel = person.battery;
  const userPosition =
    person.position && Array.isArray(person.position)
      ? person.position
      : [14.5995, 120.9842]; // ✅ fallback to Manila if null

  const getBatteryColor = (level) => {
    if (level < 30) return 'red-text';
    if (level < 60) return 'orange-text';
    return 'green-text';
  };
  const batteryColorClass = getBatteryColor(batteryLevel);


  return (
    <div className="profile-page-container">

      <div className="profile-content">

        {/* --- LEFT SIDEBAR (IDENTITY) --- */}
        <aside className="profile-sidebar">
          {/* Back Button positioned nicely in sidebar */}
          <div className="sidebar-back-wrapper">
            <button
              className="page-back-btn"
              onClick={() => navigate(-1)}
              title="Back"
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          <div className="profile-sidebar-header">
            <img
              src={person.avatar}
              alt={person.name}
              className="profile-avatar-large"
            />
            <h1 className="profile-name-large">{person.name}</h1>

            <div className={`profile-status-inline ${isBraceletOn ? 'online' : 'offline'}`}>
              <div className={`status-dot-pulse ${isBraceletOn ? 'online' : 'offline'}`}></div>
              <span>{isBraceletOn ? 'Bracelet Online' : 'Bracelet Offline'}</span>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="sidebar-btn primary">
              <Phone size={20} />
              <span>Call Now</span>
            </button>
            <button className="sidebar-btn secondary">
              <MessageSquare size={20} />
              <span>Message</span>
            </button>
          </div>
        </aside>

        {/* --- RIGHT MAIN CONTENT (DATA) --- */}
        <main className="profile-main">

          {/* 1. Stats Row */}
          <div className="dashboard-stats-row">
            <div className="dash-stat-card">
              <div className="stat-header">
                <Heart size={16} />
                <span>Heart Rate</span>
              </div>
              <span className="stat-value-large" style={{ color: 'var(--pm-danger)' }}>89 BPM</span>
            </div>

            <div className="dash-stat-card">
              <div className="stat-header">
                <Battery size={16} />
                <span>Battery Level</span>
              </div>
              <span className={`stat-value-large ${batteryColorClass}`}>{batteryLevel}%</span>
            </div>

            <div className="dash-stat-card">
              <div className="stat-header">
                <Wifi size={16} />
                <span>Signal Status</span>
              </div>
              <span className={`stat-value-large ${isOnline ? 'text-green' : 'text-red'}`}>
                {isOnline ? 'Strong' : 'Weak'}
              </span>
            </div>
          </div>

          {/* 2. Large Map Canvas */}
          <section className="dashboard-map-section">
            <div className="map-header-overlay">
              <h2 className="map-title">Live Location</h2>
              <span className="map-coords">
                {userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)}
              </span>
            </div>

            <div className="dashboard-map-wrapper">
              <MapContainer
                center={userPosition}
                zoom={18}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <ResizeMap />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={userPosition}
                  icon={createCustomIcon(person)}
                />
              </MapContainer>
            </div>
          </section>

        </main>

      </div>
    </div>
  );
};

export default UserProfile;
