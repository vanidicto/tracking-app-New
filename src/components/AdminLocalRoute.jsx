import { Navigate, Outlet } from "react-router-dom";

const KEY = "pm_admin_authed";

export default function AdminLocalRoute() {
  const isAuthed = localStorage.getItem(KEY) === "1";
  return isAuthed ? <Outlet /> : <Navigate to="/admin-login" replace />;
}
