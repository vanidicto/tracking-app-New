// src/layouts/AppLayout.jsx
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ProfileModal from '../components/ProfileModal';
import { NotificationProvider } from '../context/NotificationContext';
import { BraceletDataProvider, useBraceletUsers } from '../context/BraceletDataProvider';
import { EmergencyAlertProvider } from '../context/EmergencyAlertContext';
import EmergencyAlert from '../components/EmergencyAlert';
import './AppLayout.css';

// Inner component that lives inside both BraceletDataProvider and EmergencyAlertProvider
// so it can access address cache for the alert and pass it down.
function AppLayoutInner({
  shouldHideSidebar,
  shouldHideTopBar,
  shouldHideNavbar,
  isUserProfile,
  isProfileModalOpen,
  setIsProfileModalOpen,
}) {
  // Pull address cache from the shared BraceletDataProvider so the alert
  // can show the reverse-geocoded location without doing an extra fetch.
  const { addressCache } = useBraceletUsers();

  return (
    <div className="app-layout-container">
      {/* ── Emergency alert overlay — always rendered, shown only when sos is active ── */}
      <EmergencyAlert addressCache={addressCache} />

      {/* Desktop-only Sidebar */}
      {!shouldHideSidebar && <Sidebar />}

      {/* Top bar (is responsive inside) */}
      {!shouldHideTopBar && (
        <TopBar onProfileClick={() => setIsProfileModalOpen(true)} />
      )}

      {/* Main page content */}
      <main className={`app-content-main ${shouldHideTopBar ? 'no-navigation' : ''} ${shouldHideSidebar && !shouldHideTopBar ? 'no-sidebar' : ''}`}>
        <div className={`scrollable-content ${isUserProfile ? 'no-scroll' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile-only Bottom Navbar */}
      {!shouldHideNavbar && <Navbar />}

      {/* Profile Modal - Always available for trigger */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

const AppLayout = () => {
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  // Normalize path and check if navigation should be hidden
  const currentPath = location.pathname.toLowerCase();
  const isUserProfile = currentPath.startsWith('/app/userprofile');
  const hideNavigation = ['/app/my-bracelet', '/app/account', '/app/tips', '/app/about', '/app/notifications'].some(path => currentPath.startsWith(path));

  // Define visibility for each component
  const isReportDetail = currentPath.startsWith('/app/report') && currentPath !== '/app/report' && currentPath !== '/app/report/';
  const shouldHideAll = hideNavigation;
  const shouldHideSidebar = shouldHideAll;
  const shouldHideNavbar = shouldHideAll || isUserProfile || isReportDetail;
  const shouldHideTopBar = shouldHideAll;

  // Handle opening profile modal from navigation state
  React.useEffect(() => {
    if (location.state?.openProfile) {
      setIsProfileModalOpen(true);
    }
  }, [location]);

  return (
    <NotificationProvider>
      <BraceletDataProvider>
        <EmergencyAlertProvider>
          <AppLayoutInner
            shouldHideSidebar={shouldHideSidebar}
            shouldHideTopBar={shouldHideTopBar}
            shouldHideNavbar={shouldHideNavbar}
            isUserProfile={isUserProfile}
            isProfileModalOpen={isProfileModalOpen}
            setIsProfileModalOpen={setIsProfileModalOpen}
          />
        </EmergencyAlertProvider>
      </BraceletDataProvider>
    </NotificationProvider>
  );
};

export default AppLayout;
