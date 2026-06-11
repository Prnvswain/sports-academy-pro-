import { Navigate, useLocation } from 'react-router-dom';
import { getAdminToken, getCoachToken, getSuperAdminToken } from '../api/client';

export function AdminRoute({ children }) {
  const location = useLocation();
  const token = getAdminToken();

  if (!token) {
    return <Navigate to="/login/admin" state={{ from: location }} replace />;
  }

  return children;
}

export function CoachRoute({ children }) {
  const location = useLocation();
  const token = getCoachToken();

  if (!token) {
    return <Navigate to="/coach/login" state={{ from: location }} replace />;
  }

  return children;
}

export function SuperAdminRoute({ children }) {
  const location = useLocation();
  const token = getSuperAdminToken();

  if (!token) {
    return <Navigate to="/super-admin-login" state={{ from: location }} replace />;
  }

  return children;
}
