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

      <div className="up-content-grid">
        {/* CENTER SECTION: Avatar & Name */}
        <div className="up-identity-section">
          <div className="up-avatar-wrapper">
            <img src={person.avatar} alt={person.name} className="up-avatar-img" />
          </div>
          <h2 className="up-name">{person.name}</h2>
          
          <div className="up-signal-badge">
            <Wifi size={14} />
            <span>{isOnline ? 'Strong' : 'Weak'}</span>
          </div>
        </div>

        {/* CARDS SECTION: Battery & Bracelet Status */}
        <div className="up-cards-row">
          <div className="up-status-card">
            <span className="up-card-label">Battery:</span>
            <span className={`up-card-value ${batteryColorClass.split('-')[0]}`}>
              {batteryLevel}%
            </span>
          </div>
          
          <div className="up-status-card">
            <span className="up-card-label">Bracelet Status:</span>
            <span className={`up-card-value ${isBraceletOn ? 'success' : 'danger'}`}>
              {isBraceletOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* MAP SECTION */}
        <div className="up-map-section">
          <div className="up-map-header">
            <h3 className="up-map-title">Live Location</h3>
            <div className="up-map-coords">
              {userPosition[0].toFixed(6)},{userPosition[1].toFixed(6)}
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
