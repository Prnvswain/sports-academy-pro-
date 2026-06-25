import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';

export default function ParentLayout() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/parent/dashboard" className="text-xl font-bold text-emerald-600">
                SAMS Parent
              </Link>

              {/* Child Switcher */}
              {studentChildren.length > 1 && (
                <select
                  value={selectedChild?.student_id || ''}
                  onChange={(e) => {
                    const child = studentChildren.find((c) => c.student_id === parseInt(e.target.value));
                    setSelectedChild(child);
                  }}
                  className="ml-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  {studentChildren.map((child) => (
                    <option key={child.student_id} value={child.student_id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              to="/parent/dashboard"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive('/parent/dashboard')
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/parent/attendance"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive('/parent/attendance')
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Attendance
            </Link>
            <Link
              to="/parent/performance"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive('/parent/performance')
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Performance
            </Link>
            <Link
              to="/parent/fees"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive('/parent/fees')
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fees
            </Link>
            <Link
              to="/parent/profile"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive('/parent/profile')
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedChild ? (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Viewing: {selectedChild.name}
            </h2>
            {selectedChild.sport && (
              <p className="text-sm text-gray-600">
                Sport: {selectedChild.sport.name} | Batch: {selectedChild.batch?.name || 'Not assigned'}
              </p>
            )}
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
