import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, Activity, Zap, ChevronLeft } from 'lucide-react';
import './ReportDetail.css';

const ReportDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportId } = useParams();
  
  // Retrieve the pre-enriched incident data passed from the Report list click
  const incident = location.state?.incident;

  useEffect(() => {
    // If accessed directly without state, we should ideally fetch it or redirect back
    if (!incident) {
      navigate('/app/report', { replace: true });
    }
  }, [incident, navigate]);

  if (!incident) return null;

  // Helper for grid items
  const DetailCard = ({ icon: Icon, label, value, fullWidth }) => (
    <div className={`rd-detail-card ${fullWidth ? 'rd-detail-card-full' : ''}`}>
      <div className="rd-detail-card-icon">
        <Icon size={20} />
      </div>
      <div>
        <span className="rd-detail-card-label">{label}</span>
        <span className="rd-detail-card-value">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="rd-page-container">
      {/* HEADER SECTION */}
      <div className="rd-top-bar">
        <button
          className="rd-back-btn"
          onClick={() => navigate(-1)}
          title="Back"
        >
          <ChevronLeft size={24} color="#000" />
        </button>
        <h1 className="rd-page-title">Incident Report</h1>
      </div>

      <div className="rd-content-grid">
        {/* CENTER SECTION: Identity & Status */}
        <section className="rd-hero-section">
          <div className="rd-avatar-wrapper">
            <img
              src={incident.user.avatar}
              alt={`${incident.user.name}'s profile`}
              className="rd-avatar-img"
            />
          </div>
          <h2 className="rd-name">{incident.user.name}</h2>
          <div className={`rd-status-badge status-${incident.displayStatus.color}`}>
            {incident.displayStatus.text}
          </div>
        </section>

        {/* DETAILS GRID */}
        <section className="rd-details-section">
          <h3 className="rd-section-title">Incident Details</h3>
          <div className="rd-grid-container">
            <DetailCard icon={Calendar} label="Date" value={incident.date} />
            <DetailCard icon={Clock} label="Time" value={incident.time} />
            <DetailCard icon={Activity} label="Pulse" value={incident.pulse} />
            <DetailCard icon={Zap} label="Bracelet" value={incident.braceletStatus} />
            <DetailCard icon={MapPin} label="Location" value={incident.location} fullWidth />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportDetail;
