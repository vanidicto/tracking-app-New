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
  const hideNavigation = ['/app/my-bracelet', '/app/account', '/app/tips', '/app/about'].some(path => currentPath.startsWith(path));

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
      {!hideNavigation && <Sidebar />}

      {/* Top bar (is responsive inside) */}
      {!hideNavigation && (
        <TopBar onProfileClick={() => setIsProfileModalOpen(true)} />
      )}

      {/* Main page content */}
      <main className={`app-content-main ${hideNavigation ? 'no-navigation' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile-only Bottom Navbar */}
      {!hideNavigation && <Navbar />}

      {/* Profile Modal - Always available for trigger */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default AppLayout;