import { Navigate } from 'react-router-dom';

/** @deprecated Use /admin/* routes. Kept for backwards compatibility. */
export default function AdminDashboard() {
  return <Navigate to="/admin/coaches" replace />;
}
