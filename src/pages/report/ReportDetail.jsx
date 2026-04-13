// src/pages/report/ReportDetail.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, Zap, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import ReportExportCard from './ReportExportCard';
import './ReportDetail.css';

const ReportDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportId } = useParams();

  const incident = location.state?.incident;
  const exportCardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!incident) navigate('/app/report', { replace: true });
  }, [incident, navigate]);

  // ── Export to PNG ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleExport = async () => {
      if (!exportCardRef.current || isExporting) return;
      setIsExporting(true);
      try {
        const images = Array.from(exportCardRef.current.querySelectorAll('img'));
        await Promise.all(
          images.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })
          )
        );
        await new Promise((r) => setTimeout(r, 120));

        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(exportCardRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const safeName = (incident?.user?.name || 'incident').replace(/\s+/g, '_').toLowerCase();
        const fileName = `pingme_incident_${safeName}_${Date.now()}.png`;
        const dataUrl = canvas.toDataURL('image/png');

        // Feature detection for universal native share (Mobile/PWA)
        if (navigator.share && navigator.canShare) {
          try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'PingMe Incident Report',
                text: `Incident Report for ${incident?.user?.name || 'Bracelet'}`,
                files: [file]
              });
              return; // Successfully shared, skip standard download
            }
          } catch (err) {
            console.log('Share API aborted or failed, falling back to download...', err);
          }
        }

        // Standard PC Web Fallback
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Export failed:', err);
        alert('Export failed. Please try again.');
      } finally {
        setIsExporting(false);
      }
    };

    window.addEventListener('pingme:export-report', handleExport);
    return () => window.removeEventListener('pingme:export-report', handleExport);
  }, [incident, isExporting]);

  if (!incident) return null;

  const getLevelLabel = (level) => {
    if (level === 3) return 'Level 3 — Severe';
    if (level === 2) return 'Level 2 — Moderate';
    return 'Level 1 — Mild';
  };

  // Determine whether we have start-of-SOS data (new reports) or only end data (legacy reports)
  const hasTimeline = !!(incident.sosStartDate || incident.sosStartTime);

  const DetailCard = ({ icon: Icon, label, value, fullWidth }) => (
    <div className={`rd-detail-card ${fullWidth ? 'rd-detail-card-full' : ''}`}>
      <div className="rd-detail-card-icon"><Icon size={20} /></div>
      <div>
        <span className="rd-detail-card-label">{label}</span>
        <span className="rd-detail-card-value">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="rd-page-container">

      {/* Off-screen export card */}
      <ReportExportCard ref={exportCardRef} incident={incident} />

      {/* Exporting overlay */}
      {isExporting && (
        <div className="rd-export-overlay">
          <div className="rd-export-spinner" />
          <p>Generating image…</p>
        </div>
      )}

      <div className="rd-content-grid">
        {/* Hero */}
        <section className="rd-hero-section">
          <div className="rd-avatar-wrapper">
            <img src={incident.user.avatar} alt={incident.user.name} className="rd-avatar-img" />
          </div>
          <h2 className="rd-name">{incident.user.name}</h2>
          <div className={`rd-status-badge status-${incident.displayStatus.color}`}>
            {incident.displayStatus.text}
          </div>
        </section>

        {/* Static info: Bracelet + Level */}
        <section className="rd-details-section">
          <h3 className="rd-section-title">Incident Details</h3>
          <div className="rd-grid-container">
            <DetailCard icon={Zap}          label="Bracelet"       value={incident.braceletStatus} fullWidth />
            <DetailCard icon={ShieldAlert}  label="Incident Level" value={getLevelLabel(incident.sosLevel)} fullWidth />
          </div>
        </section>

        {/* ── Chronological Timeline ── */}
        <section className="rd-details-section">
          <h3 className="rd-section-title">Incident Timeline</h3>

          <div className="rd-timeline">

            {/* ── Phase 1: Request for Help ── */}
            <div className="rd-timeline-item">
              <div className="rd-timeline-marker rd-marker-sos">
                <AlertCircle size={16} />
              </div>
              <div className="rd-timeline-connector" />
              <div className="rd-timeline-content">
                <p className="rd-timeline-phase rd-phase-sos">Request for Help</p>
                <div className="rd-grid-container rd-timeline-grid">
                  <DetailCard icon={Calendar} label="Date" value={incident.sosStartDate || incident.date || '—'} />
                  <DetailCard icon={Clock}    label="Time" value={incident.sosStartTime || incident.time || '—'} />
                  <DetailCard icon={MapPin}   label="Location" value={incident.sosStartLocation || incident.location || 'Unknown'} fullWidth />
                </div>
              </div>
            </div>

            {/* ── Phase 2: Marked Safe ── */}
            <div className="rd-timeline-item rd-timeline-item-last">
              <div className="rd-timeline-marker rd-marker-safe">
                <CheckCircle2 size={16} />
              </div>
              <div className="rd-timeline-content">
                <p className="rd-timeline-phase rd-phase-safe">Marked Safe</p>
                <div className="rd-grid-container rd-timeline-grid">
                  <DetailCard icon={Calendar} label="Date" value={incident.date || '—'} />
                  <DetailCard icon={Clock}    label="Time" value={incident.time || '—'} />
                  <DetailCard icon={MapPin}   label="Location" value={incident.location || 'Unknown'} fullWidth />
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportDetail;
