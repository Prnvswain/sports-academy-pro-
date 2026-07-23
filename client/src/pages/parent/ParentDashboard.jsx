import { useEffect, useState } from 'react';
import { parentGet } from '../../api/client';

export default function ParentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchDashboardData(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Load active batch sessions for the parent's students
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        setSessionsLoading(true);
        const result = await parentGet('/parent/batch-sessions/active');
        setActiveSessions(result.data || []);
      } catch (err) {
        console.error('Failed to load active sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };
    loadActiveSessions();
    
    // Refresh every minute
    const interval = setInterval(loadActiveSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
        
        if (data.data?.students && data.data.students.length > 0) {
          setStudentsList(data.data.students);
          setSelectedStudentId(data.data.students[0].student_id);
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

  const fetchDashboardData = async (studentId) => {
    try {
      const token = localStorage.getItem('parent_token');
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

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">No dashboard data available.</p>
        </div>
      </div>
    );
  }

  const parent = dashboardData?.parent || {};
  const metrics = dashboardData?.metrics || { attendanceRate: 0, avgPerformanceScore: 0, pendingFees: 0, totalStudents: 0, recentNotes: [] };
  const currentStudent = studentsList.find(s => s.student_id === selectedStudentId) || {};

  // Check if current student has an active session
  const studentActiveSession = activeSessions.find(s => s.batch_id === currentStudent.batch_id);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {parent?.name || 'Parent'}!</h1>
        <p className="text-gray-600 mt-1">Track your child's progress and achievements</p>
      </div>

      {/* LIVE Session Banner */}
      {studentActiveSession && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
              <div>
                <h3 className="font-bold text-green-800">🟢 LIVE Session Active</h3>
                <p className="text-sm text-green-700">
                  {studentActiveSession.batch?.name} • {studentActiveSession.batch?.sport?.name} • Coach: {studentActiveSession.coach?.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">Started at {new Date(studentActiveSession.start_time).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}

          {/* Multi-Child Selector Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Child</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsList.map((student) => (
                <button
                  key={student.student_id}
                  onClick={() => setSelectedStudentId(student.student_id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedStudentId === student.student_id
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      selectedStudentId === student.student_id ? 'bg-emerald-600' : 'bg-teal-500'
                    }`}>
                      {getInitials(student.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {student.sport?.name || 'Sport'} • {student.batch?.name || 'Batch'}
                      </p>
                    </div>
                    {selectedStudentId === student.student_id && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Metric Cards for Selected Child */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Attendance Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-emerald-100">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">Attendance</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.attendanceRate}%</p>
              <p className="text-sm text-gray-500 mt-1">Overall attendance rate</p>
            </div>

            {/* Performance Score */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">Performance</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.avgPerformanceScore || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Average performance score</p>
            </div>

            {/* Pending Fees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">Pending Fees</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{Number(metrics.pendingFees || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total pending amount</p>
            </div>
          </div>

          {/* Recent Coach Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Coach Notes</h2>
            </div>
            <div className="p-6">
              {metrics.recentNotes && metrics.recentNotes.length > 0 ? (
                <div className="space-y-4">
                  {metrics.recentNotes.map((note, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
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
        </div>
  );
}