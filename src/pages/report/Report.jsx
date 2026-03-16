import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useBraceletUsers } from '../../hooks/useUsers';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/skeleton/Skeleton';
import './Report.css';

const Report = () => {
  const [reports, setReports] = useState([]);
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
        color: 'black',
        icon: ShieldAlert
      },
      // Map fields for the modal
      braceletStatus: report.braceletStatus ? 'On' : 'Off',
    };
  };

  // Removed handleRowClick as we'll use <Link> directly in JSX

  if (!reports.length) return (
    <div className="report-page-frame skeleton-wrapper">
      <main className="app-main">
        <ul className="incident-list" style={{ boxShadow: 'none' }} aria-label="Loading reports">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={`skeleton-${i}`} className="incident-item skeleton-report-item">
              <div className="incident-link-wrapper" style={{ cursor: 'default' }}>
                <div className="skeleton-icon-wrapper">
                  <Skeleton type="avatar" width="36px" height="36px" />
                </div>
                <div className="incident-details skeleton-details-flex">
                  <Skeleton type="text" width="60%" height="18px" className="skeleton-report-title" />
                  <Skeleton type="text" width="40%" height="14px" />
                </div>
                <div className="incident-time-wrapper">
                  <Skeleton type="text" width="40px" height="12px" className="skeleton-report-time" />
                  <Skeleton type="avatar" width="20px" height="20px" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );

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
              >
                <Link 
                  to={`/app/report/${incident.id}`}
                  state={{ 
                    incident: { 
                      ...incident,
                      displayStatus: { 
                        text: incident.displayStatus.text,
                        color: incident.displayStatus.color
                      } 
                    } 
                  }}
                  className="incident-link-wrapper"
                >
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
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
};

export default Report;