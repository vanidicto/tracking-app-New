import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { currentUser } = useAuth();

  // If authorized, render child routes (Outlet)
  // If not, redirect to login replacing the previous invalid route in history
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}