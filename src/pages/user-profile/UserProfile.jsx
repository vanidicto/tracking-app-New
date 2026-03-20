// src/pages/app/UserProfile.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Phone, Wifi, Battery, ChevronLeft } from 'lucide-react';
import './UserProfile.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { createCustomIcon, buildUserWithDevice, isUserOnline, parseFirestoreDate, parseLocation } from '../../utils/mapHelpers';
import { reverseGeocode } from '../../utils/geocode';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

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

  const [person, setPerson] = useState(location.state?.personData);
  const [address, setAddress] = useState("Fetching location...");

  // Real-time synchronization for the specific user
  useEffect(() => {
    if (!person?.id) return;

    // Listen to braceletUsers for static info (emergency contacts, etc.)
    const unsubUser = onSnapshot(doc(db, 'braceletUsers', person.id), (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setPerson(prev => ({
          ...prev,
          name: userData.name || prev.name,
          avatar: userData.avatar || prev.avatar,
          emergencyContacts: userData.emergencyContacts || prev.emergencyContacts || [],
          serialNumber: userData.serialNumber || prev.serialNumber
        }));
      }
    });

    // Listen to deviceStatus for real-time info (battery, location, SOS)
    const unsubDevice = onSnapshot(doc(db, 'deviceStatus', person.id), (deviceSnap) => {
      if (deviceSnap.exists()) {
        const dd = deviceSnap.data();
        const loc = parseLocation(dd.location) || parseLocation(dd);
        const lastSeen = parseFirestoreDate(dd.lastSeen);
        const online = isUserOnline(lastSeen);

        setPerson(prev => ({
          ...prev,
          battery: Number(dd.battery ?? prev.battery),
          braceletOn: online ? Boolean(dd.isBraceletOn ?? prev.braceletOn) : false,
          lastSeen,
          sos: (dd.sos && (dd.sos.active ?? dd.sos)) || false,
          position: loc || prev.position,
          online: online,
          currentGeofenceId: dd.currentGeofenceId ?? prev.currentGeofenceId,
          deviceStatusId: deviceSnap.id ?? prev.deviceStatusId
        }));
      }
    });

    return () => {
      unsubUser();
      unsubDevice();
    };
  }, [person?.id]);

  useEffect(() => {
    if (person?.position) {
      reverseGeocode(person.position[0], person.position[1]).then((addr) => {
        setAddress(addr || "Address not found");
      });
    }
  }, [person?.position]);

  const userPosition =
    person?.position && Array.isArray(person.position)
      ? person.position
      : [14.5995, 120.9842]; // fall back

  const getBatteryColor = (level) => {
    if (level < 30) return 'red-text';
    if (level < 60) return 'orange-text';
    return 'green-text';
  };
  const batteryColorClass = getBatteryColor(person?.battery || 0);

  const formatLastSeen = (date) => {
    if (!date) return "N/A";
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };


  return (
    <div className="up-page-container">
      <div className="up-content-grid">
        
        {/* ROW 1: Avatar (Left) & Details (Right) */}
        <div className="up-top-row">
          <div className="up-avatar-wrapper">
            <img src={person?.avatar} alt={person?.name} className="up-avatar-img" />
          </div>
          
          <div className="up-details-box">
            <div className="up-detail-line">
              <span className="up-detail-label">Serial Number</span>
              <span className="up-detail-value">{person?.serialNumber || "N/A"}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Emergency Name.</span>
              <span className="up-detail-value">{person?.emergencyContacts?.[0]?.name || "N/A"}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Emergency No.</span>
              <span className="up-detail-value">{person?.emergencyContacts?.[0]?.contactNo || "N/A"}</span>
            </div>
            <div className="up-detail-line">
              <span className="up-detail-label">Last Seen</span>
              <span className="up-detail-value">{formatLastSeen(person?.lastSeen)}</span>
            </div>
          </div>
        </div>

        {/* ROW 2: Name & Signal */}
        <div className="up-identity-row">
          <h2 className="up-name">{person?.name}</h2>
          <div className={`up-signal-badge ${person?.online ? 'strong' : 'weak'}`}>
            <Wifi size={14} />
            <span>{person?.online ? 'Strong' : 'Weak'}</span>
          </div>
        </div>

        {/* ROW 3: Battery & Bracelet Status Component */}
        <div className="up-status-bar">
          <div className="up-status-item">
            <Battery size={16} className={`up-icon ${batteryColorClass.split('-')[0]}`} />
            <span className="up-status-label">Battery:</span>
            <span className={`up-status-value ${batteryColorClass.split('-')[0]}`}>
              {person?.battery || 0}%
            </span>
          </div>
          
          <div className="up-status-divider"></div>
          
          <div className="up-status-item">
            <span className="up-status-label">Bracelet:</span>
            <span className={`up-status-value ${person?.braceletOn ? 'success' : 'danger'}`}>
              {person?.braceletOn ? 'ON' : 'OFF'}
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
              >
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
      </div>
    </div>
  );
};

export default UserProfile;
