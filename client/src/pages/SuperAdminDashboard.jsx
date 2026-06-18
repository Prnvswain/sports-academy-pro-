import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import ThemeToggle from '../components/ThemeToggle';
import { clearSuperAdminToken, superAdminGet, superAdminPatch } from '../api/client';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, academiesRes] = await Promise.all([
        superAdminGet('/super-admin/stats'),
        superAdminGet('/super-admin/academies')
      ]);
      const statsData = statsRes?.data || {};
      const academiesData = academiesRes?.data || [];
      
      // Ensure stats has all required fields with default values
      setStats({
        total_academies: statsData.total_academies ?? 0,
        active_academies: statsData.active_academies ?? 0,
        total_students: statsData.total_students ?? 0,
        total_coaches: statsData.total_coaches ?? 0
      });
      
      // Ensure academies have _count with default values
      setAcademies(academiesData.map(a => ({
        ...a,
        _count: {
          students: a._count?.students ?? 0,
          coaches: a._count?.coaches ?? 0
        }
      })));
    } catch (error) {
      setMessage(error.message);
      // Set default values on error
      setStats({
        total_academies: 0,
        active_academies: 0,
        total_students: 0,
        total_coaches: 0
      });
      setAcademies([]);
      if (error.status === 401) {
        clearSuperAdminToken();
        navigate('/super-admin-login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (academyId, status) => {
    try {
      await superAdminPatch(`/super-admin/academies/${academyId}/status`, { status });
      setMessage(`Academy #${academyId} set to ${status}`);
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    clearSuperAdminToken();
    navigate('/super-admin-login');
  };

  if (loading) {
    return <Loader message="Loading platform dashboard…" />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h1 className="text-lg font-bold">SAMS Super Admin</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button type="button" className="btn-danger" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 p-6">
        {message && <p className="alert-info">{message}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="kpi-card">
            <span className="kpi-label">Academies</span>
            <span className="kpi-value">{stats?.total_academies ?? 0}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Active</span>
            <span className="kpi-value">{stats?.active_academies ?? 0}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Students</span>
            <span className="kpi-value">{stats?.total_students ?? 0}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Coaches</span>
            <span className="kpi-value">{stats?.total_coaches ?? 0}</span>
          </div>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="mb-4 text-xl font-bold">Academies</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Students</th>
                <th>Coaches</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {academies.map((a) => (
                <tr key={a.academy_id}>
                  <td>{a.academy_id}</td>
                  <td>{a.name}</td>
                  <td>{a.subscription_plan || '—'}</td>
                  <td>{a.status}</td>
                  <td>{a._count?.students ?? 0}</td>
                  <td>{a._count?.coaches ?? 0}</td>
                  <td className="flex flex-wrap gap-2">
                    <button type="button" className="btn-success btn-sm" onClick={() => updateStatus(a.academy_id, 'active')}>
                      Activate
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => updateStatus(a.academy_id, 'suspended')}>
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
