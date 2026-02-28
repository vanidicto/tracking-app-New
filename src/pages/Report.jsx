import { useState, useEffect } from 'react';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useBraceletUsers } from '../hooks/useUsers';
import { useAuth } from '../context/AuthContext';
import ReportDetailModal from '../components/ReportDetailModal';
import LoadingSpinner from '../components/LoadingSpinner'
import './Report.css';

const Report = () => {
  const [reports, setReports] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const { braceletUsers } = useBraceletUsers();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      return;
    }

    // Listen to reports collection
    const q = query(
      collection(db, 'reports'),
      where('appUserId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sort by date/time (Newest first)
      fetchedReports.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA;
      });

      setReports(fetchedReports);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Helper to merge report data with user data
  const getEnrichedReport = (report) => {
    const user = braceletUsers.find(u => u.id === report.braceletUserId) || {
      name: 'Unknown Device',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'
    };
    return {
      ...report,
      user: {
        name: user.name,
        avatar: user.avatar
      },
      // Since reports are generated when SOS turns OFF, we treat them as "Resolved"
      displayStatus: { 
        text: 'Marked Safe',
        color: 'red', 
        icon: ShieldAlert 
      },
      // Map fields for the modal
      pulse: `${report.pulseRate} bpm`,
      braceletStatus: report.braceletStatus ? 'On' : 'Off',
    };
  };

  const handleRowClick = (incident) => {
    setSelectedIncident(getEnrichedReport(incident));
  };

  const handleCloseModal = () => {
    setSelectedIncident(null);
  };

  if(!reports.length) return (
    <LoadingSpinner />
  )

  return (
    <div className="report-page-frame">
      <main className="app-main">
        <ul className="incident-list" aria-label="Incident list">
          {reports.map(rawReport => {
            const incident = getEnrichedReport(rawReport);
            const IconComponent = incident.displayStatus.icon;
            
            return (
              <li
                key={incident.id}
                className="incident-item"
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(rawReport)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(rawReport);
                  }
                }}
              >
                <div className="incident-link-wrapper">
                    <div className={`incident-icon-wrapper ${incident.displayStatus.color}`}>
                        <IconComponent size={20} />
                    </div>

                    <div className="incident-details">
                        <p className={`incident-type ${incident.displayStatus.color}`}>{incident.displayStatus.text}</p>
                        <p className="incident-date-location">
                        {incident.date} &bull; {incident.location}
                        </p>
                    </div>

                    <div className="incident-time-wrapper">
                        <span className="incident-date-right">
                            {incident.time}
                        </span>
                        <ChevronRight size={20} className="chevron-icon" />
                    </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      {selectedIncident && (
        <ReportDetailModal
          incident={selectedIncident}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Report;