import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./context/Login";
import Signup from "./context/Signup";
import ForgotPassword from "./context/ForgotPassword";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./layouts/AppLayout";
import ReloadPrompt from "./components/ReloadPrompt";

import People from "./pages/people/People";
import UserProfile from "./pages/user-profile/UserProfile";
import Places from "./pages/places/Places";
import Report from "./pages/report/Report";
import ReportDetail from "./pages/report/ReportDetail";
import Home from "./pages/home-page/Home";
import Landing from "./pages/landing-page/Landing";
import Onboarding from "./pages/onboarding/Onboarding";

import "./App.css";

import AccountMenu from "./pages/account/AccountMenu";
import Account from "./pages/account/Account";
import AccountSecurity from "./pages/account/AccountSecurity";
import MyBraceletMenu from "./pages/my-bracelet/MyBraceletMenu";
import MyBraceletConfig from "./pages/my-bracelet/MyBraceletConfig";
import MyBraceletEmergency from "./pages/my-bracelet/MyBraceletEmergency";
import MyBraceletLoad from "./pages/my-bracelet/MyBraceletLoad";
import MyBraceletObservers from "./pages/my-bracelet/MyBraceletObservers";
import Tips from "./pages/tips/Tips";
import About from "./pages/about/About";
import Notifications from "./pages/notifications/Notifications";

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
        <ReloadPrompt />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />

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
              <Route path="report/:reportId" element={<ReportDetail />} />
              <Route path="places" element={<Places />} />
              <Route path="userProfile/:userId" element={<UserProfile />} />

              {/* Profile modal routes */}
              <Route path="account" element={<AccountMenu />} />
              <Route path="account/info" element={<Account />} />
              <Route path="account/security" element={<AccountSecurity />} />
              <Route path="my-bracelet" element={<MyBraceletMenu />} />
              <Route path="my-bracelet/config" element={<MyBraceletConfig />} />
              <Route path="my-bracelet/emergency" element={<MyBraceletEmergency />} />
              <Route path="my-bracelet/load" element={<MyBraceletLoad />} />
              <Route path="my-bracelet/observers" element={<MyBraceletObservers />} />
              <Route path="tips" element={<Tips />} />
              <Route path="about" element={<About />} />
              <Route path="notifications" element={<Notifications />} />
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
