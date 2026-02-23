import { Navigate, Outlet } from "react-router-dom";

/**
 * DEV-ONLY ADMIN GUARD (no Firebase).
 * Set this to false if you want to simulate "not admin".
 */
const IS_ADMIN_LOCAL = true;

export default function AdminRouteMock() {
  if (!IS_ADMIN_LOCAL) return <Navigate to="/app" replace />;
  return <Outlet />;
}
