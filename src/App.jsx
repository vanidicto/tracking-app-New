import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./context/Login";
import Signup from "./context/Signup";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./layouts/AppLayout";

import People from "./pages/People";
import UserProfile from "./pages/UserProfile";
import Places from "./pages/Places";
import Report from "./pages/Report";
import Home from "./pages/Home";
import Landing from "./pages/Landing";

import "./App.css";

import Account from "./pages/Account";
import MyRoom from "./pages/MyRoom";
import PrivacySecurity from "./pages/PrivacySecurity";
import HelpArticles from "./pages/HelpArticles";
import ChatSupport from "./pages/ChatSupport";
import About from "./pages/About";

// Mock Admin (NO Firebase)
import AdminLocalRoute from "./components/AdminLocalRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayoutLocal from "./layouts/AdminLayoutLocal";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDevices from "./pages/admin/AdminDevices";
import AdminSupport from "./pages/admin/AdminSupport";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/*Admin mock login (public, no Firebase) */}
          <Route path="/admin-login" element={<AdminLogin />} />

          {/*Admin mock protected routes */}
          <Route element={<AdminLocalRoute />}>
            <Route path="/admin" element={<AdminLayoutLocal />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="devices" element={<AdminDevices />} />
              <Route path="support" element={<AdminSupport />} />
            </Route>
          </Route>

          {/* Firebase-protected user app */}
          <Route element={<PrivateRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="people" element={<People />} />
              <Route path="report" element={<Report />} />
              <Route path="places" element={<Places />} />
              <Route path="userProfile/:userId" element={<UserProfile />} />

              {/* Profile modal routes */}
              <Route path="account" element={<Account />} />
              <Route path="my-room" element={<MyRoom />} />
              <Route path="privacy" element={<PrivacySecurity />} />
              <Route path="help" element={<HelpArticles />} />
              <Route path="support" element={<ChatSupport />} />
              <Route path="about" element={<About />} />
            </Route>
          </Route>

          {/* Fallback so you never get blank screen */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
