// src/pages/app/UserProfile.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Phone, Wifi, Battery, ChevronLeft } from 'lucide-react';
import './UserProfile.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { createCustomIcon } from '../../utils/mapHelpers';

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
  const 
  
  userPosition =
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
    <div className="up-page-container">
      <button
        className="up-back-btn"
        onClick={() => navigate(-1)}
        title="Back"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="up-content-grid">
        {/* Left Section: Identity & Vitals */}
        <div className="up-left-section">
          <div className="up-identity-header">
            <div className="up-avatar-wrapper">
              <img src={person.avatar} alt={person.name} className="up-avatar-img" />
              <div className={`up-status-dot ${isBraceletOn ? 'online' : 'offline'}`} />
            </div>
            <div className="up-name-info">
              <h1 className="up-name">{person.name}</h1>
              <p className="up-status-label">{isBraceletOn ? 'Bracelet Online' : 'Bracelet Offline'}</p>
            </div>
          </div>

          <div className="up-vitals-list">


            <div className="up-vital-row">
              <div className="up-vital-icon"><Battery size={20} /></div>
              <div className="up-vital-content">
                <span className="up-vital-label">Battery Level</span>
                <span className={`up-vital-value ${batteryColorClass.split('-')[0]}`}>{batteryLevel}%</span>
              </div>
            </div>

            <div className="up-vital-row">
              <div className="up-vital-icon"><Wifi size={20} /></div>
              <div className="up-vital-content">
                <span className="up-vital-label">Signal Status</span>
                <span className={`up-vital-value ${isOnline ? 'success' : 'danger'}`}>
                  {isOnline ? 'Strong' : 'Weak'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Map */}
        <div className="up-right-section">
          <div className="up-map-header">
            <h2 className="up-map-title">Live Location</h2>
            <div className="up-map-coords">
              {userPosition[0].toFixed(6)}, {userPosition[1].toFixed(6)}
            </div>
          </div>

          <div className="up-map-container">
            <MapContainer

              attributionControl={false}
              center={userPosition}
              zoom={15}
              style={{ width: '100%', height: '100%' }}
            >
              <ResizeMap />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={userPosition}
                icon={createCustomIcon(person)}
              />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
