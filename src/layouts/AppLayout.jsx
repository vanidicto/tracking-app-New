// src/layouts/AppLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar'; // 1. Import TopBar
import './AppLayout.css';

const AppLayout = () => {
  const location = useLocation();
  const hideNavigation = location.pathname === '/app/my-bracelet';

  return (
    <div className="app-layout-container">
      {/* --- RENDER ALL LAYOUT COMPONENTS --- */}

      {/* Desktop-only Sidebar */}
      {!hideNavigation && <Sidebar />}

      {/* Top bar (is responsive inside) */}
      {!hideNavigation && <TopBar />}

      {/* Main page content */}
      <main className={`app-content-main ${hideNavigation ? 'no-navigation' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile-only Bottom Navbar */}
      {!hideNavigation && <Navbar />}
    </div>
  );
};

export default AppLayout;