// src/layouts/AppLayout.jsx
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ProfileModal from '../components/ProfileModal';
import './AppLayout.css';

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
    <div className="app-layout-container">
      {/* --- RENDER ALL LAYOUT COMPONENTS --- */}

      {/* Desktop-only Sidebar */}
      {!shouldHideSidebar && <Sidebar />}

      {/* Top bar (is responsive inside) */}
      {!shouldHideTopBar && (
        <TopBar onProfileClick={() => setIsProfileModalOpen(true)} />
      )}

      {/* Main page content */}
      <main className={`app-content-main ${shouldHideTopBar ? 'no-navigation' : ''} ${shouldHideSidebar && !shouldHideTopBar ? 'no-sidebar' : ''}`}>
        <Outlet />
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
};

export default AppLayout;
