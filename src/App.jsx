import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./context/Login";
import Signup from "./context/Signup";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./layouts/AppLayout";

import People from "./pages/people/People";
import UserProfile from "./pages/user-profile/UserProfile";
import Places from "./pages/places/Places";
import Report from "./pages/report/Report";
import Home from "./pages/home-page/Home";
import Landing from "./pages/landing-page/Landing";

import "./App.css";

import Account from "./pages/account/Account";
import MyBracelet from "./pages/my-bracelet/MyBracelet";
import HelpArticles from "./pages/help-articles/HelpArticles";
import About from "./pages/about/About";

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
              <Route path="my-bracelet" element={<MyBracelet />} />
              <Route path="help" element={<HelpArticles />} />
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
