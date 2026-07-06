import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';

function ParentLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [studentChildren, setStudentChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('parent_token');
    const userData = localStorage.getItem('parent_user');

    console.log('ParentLayout - Token:', token ? 'exists' : 'missing');
    console.log('ParentLayout - UserData:', userData ? 'exists' : 'missing');

    if (!token || !userData) {
      console.log('ParentLayout - Redirecting to login');
      navigate('/parent/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      console.error('ParentLayout - Failed to parse user data:', error);
      localStorage.removeItem('parent_user');
      navigate('/parent/login');
      return;
    }

    fetchChildren();
  }, [navigate]);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/children', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Children data received:', data);
        setStudentChildren(data.data || []);
        if (data.data?.length > 0) {
          setSelectedChild(data.data[0]);
        }
      } else {
        console.error('Failed to fetch children:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    localStorage.removeItem('parent_user');
    navigate('/parent/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parent portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">No user data found. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-lg flex flex-col h-screen sticky top-0">
        {/* Branding */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-emerald-600">SAMS Parent</h1>
          <p className="text-sm text-gray-500 mt-1">Sports Academy Portal</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/parent/dashboard"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/parent/dashboard')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
            }`}
          >
            <span className="text-xl">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link
            to="/parent/attendance"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/parent/attendance')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
            }`}
          >
            <span className="text-xl">📅</span>
            <span>Attendance</span>
          </Link>
          <Link
            to="/parent/performance"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/parent/performance')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
            }`}
          >
            <span className="text-xl">⚡</span>
            <span>Performance</span>
          </Link>
          <Link
            to="/parent/fees"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/parent/fees')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
            }`}
          >
            <span className="text-xl">💰</span>
            <span>Fees</span>
          </Link>
          <Link
            to="/parent/settings"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/parent/settings')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <p className="text-sm text-gray-500">Logged in as</p>
            <p className="font-semibold text-gray-900 truncate">{user?.name || 'Parent'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function ParentLayout() {
  return (
    <ParentLayoutShell />
  );
}
