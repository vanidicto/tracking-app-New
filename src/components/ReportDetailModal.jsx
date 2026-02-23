import { X, Calendar, Clock, MapPin, Activity, Zap } from 'lucide-react';
import './ReportDetailModal.css';

const ReportDetailModal = ({ incident, onClose }) => {
  if (!incident) {
    return null;
  }

  // Helper for grid items
  const DetailCard = ({ icon: Icon, label, value, fullWidth }) => (
    <div className={`detail-card ${fullWidth ? 'detail-card-full' : ''}`}>
      <div className="detail-card-icon">
        <Icon size={20} />
      </div>
      <div>
        <span className="detail-card-label">{label}</span>
        <span className="detail-card-value">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Incident Report</h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="report-detail-modal-body">
          <section className="profile-hero">
            <div className="profile-avatar-wrapper">
              <img
                src={incident.user.avatar}
                alt={`${incident.user.name}'s profile`}
                className="profile-avatar-img"
              />
            </div>
            <h1 className="profile-name">{incident.user.name}</h1>
            <div className={`status-badge status-${incident.displayStatus.color}`}>
              {incident.displayStatus.text}
            </div>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Incident Details</h2>
            <div className="profile-grid-container">
              <DetailCard icon={Calendar} label="Date" value={incident.date} />
              <DetailCard icon={Clock} label="Time" value={incident.time} />
              <DetailCard icon={Activity} label="Pulse" value={incident.pulse} />
              <DetailCard icon={Zap} label="Bracelet" value={incident.braceletStatus} />
              <DetailCard icon={MapPin} label="Location" value={incident.location} fullWidth />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
