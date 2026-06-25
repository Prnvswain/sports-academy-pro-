import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [studentsList, setStudentsList] = useState([]); // Multiple bache handle karne ke liye
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pehle render par primary data load hoga
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Jab bhi user drop-down badlega, naya filtered data fetch hoga
  useEffect(() => {
    if (selectedStudentId) {
      fetchDashboardData(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Pehle call me parent ke saare students nikalenge
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
        
        // Agar students list aa rahi hai toh use set karein
        if (data.data?.students && data.data.students.length > 0) {
          setStudentsList(data.data.students);
          setSelectedStudentId(data.data.students[0].id); // Pehla student default active
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Student specific data fetch handler
  const fetchDashboardData = async (studentId) => {
    try {
      const token = localStorage.getItem('parent_token');
      // Pass the studentId as query param to match backend configuration safely
      const response = await fetch(`/api/v1/parent/dashboard?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Failed to update student metrics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-4">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 m-4">
        <p className="text-gray-600">No dashboard data available.</p>
      </div>
    );
  }

  // Safe destructuring using fallbacks to avoid 404/Crash behaviors
  const parent = dashboardData?.parent || {};
  const metrics = dashboardData?.metrics || { attendanceRate: 0, avgPerformanceScore: 'N/A', pendingFees: 0, totalStudents: 0, recentNotes: [] };
  const currentStudent = studentsList.find(s => s.id === selectedStudentId) || {};

  return (
    <div className="space-y-6 p-4">
      
      {/* Top Navigation & Dynamic Dropdown Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-800">SAMS Parent Portal</span>
          
          {/* Dynamic Student Selector Dropdown */}
          {studentsList.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-2 font-medium"
            >
              {studentsList.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="text-sm text-gray-600 font-medium">
          Logged in as: <span className="text-emerald-600">{parent?.name || 'User'}</span>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {parent?.name || 'Parent'}!</h1>
        <p className="text-emerald-100">
          Track your child's progress, attendance, and achievements all in one place.
        </p>
      </div>

      {/* Current Viewing Profile Bar */}
      <div className="bg-white border-l-4 border-emerald-500 rounded-lg shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Viewing Profile</p>
        <h3 className="text-lg font-bold text-gray-800">{currentStudent?.name || 'No Student Selected'}</h3>
        <p className="text-xs text-gray-500 mt-1">
          Sport: <span className="font-medium text-gray-700">{currentStudent?.sport?.name || 'Cricket'}</span> | Batch: <span className="font-medium text-gray-700">{currentStudent?.batch?.name || 'Not assigned'}</span>
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow p-6 border-b-4 border-emerald-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.attendanceRate}%</p>
            </div>
          </div>
        </div>

        {/* Performance Score Card */}
        <div className="bg-white rounded-lg shadow p-6 border-b-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Performance Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgPerformanceScore || 'A'}</p>
            </div>
          </div>
        </div>

        {/* Pending Fees Card */}
        <div className="bg-white rounded-lg shadow p-6 border-b-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending Fees</p>
              <p className="text-2xl font-bold text-gray-900">₹{Number(metrics.pendingFees || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Total Children Config Card */}
        <div className="bg-white rounded-lg shadow p-6 border-b-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Children Linked</p>
              <p className="text-2xl font-bold text-gray-900">{studentsList.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Coach Notes</h2>
        </div>
        <div className="p-6">
          {metrics.recentNotes && metrics.recentNotes.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentNotes.map((note, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Coach note:</span> {note.note_text || note.content || 'No content'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.note_date || note.created_at || note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent coach notes available for this student.</p>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/parent/attendance')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto text-emerald-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm text-gray-700">View Attendance</span>
          </button>

          <button 
            onClick={() => navigate('/parent/performance')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm text-gray-700">Performance</span>
          </button>

          <button 
            onClick={() => navigate('/parent/fees')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto text-yellow-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm text-gray-700">Pay Fees</span>
          </button>

          <button 
            onClick={() => navigate('/parent/profile')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm text-gray-700">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}