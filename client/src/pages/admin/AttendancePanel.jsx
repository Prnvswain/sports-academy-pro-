import { useState, useEffect } from 'react';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

export default function AttendancePanel() {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadBatches();
    loadStudents();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [fromDate, toDate, selectedBatch, selectedStudent, selectedStatus]);

  const loadBatches = async () => {
    try {
      const response = await adminGet('/admin/batches');
      setBatches(response.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const loadStudents = async () => {
    try {
      const response = await adminGet('/admin/students');
      setStudents(response.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (selectedBatch) params.set('batch_id', selectedBatch);
      if (selectedStudent) params.set('student_id', selectedStudent);
      if (selectedStatus) params.set('status', selectedStatus);

      const qs = params.toString() ? `?${params}` : '';
      const response = await adminGet(`/admin/attendance${qs}`);
      setAttendance(response.data || []);
      setMessage({ text: '', type: '' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const summary = {
      total: attendance.length,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      halfDay: 0
    };

    attendance.forEach(record => {
      switch (record.status) {
        case 'PRESENT': summary.present++; break;
        case 'ABSENT': summary.absent++; break;
        case 'LATE': summary.late++; break;
        case 'LEAVE': summary.leave++; break;
        case 'HALF_DAY': summary.halfDay++; break;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedBatch('');
    setSelectedStudent('');
    setSelectedStatus('');
  };

  if (loading && attendance.length === 0) {
    return <Loader message="Loading attendance data…" />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Attendance Management</h2>
        <p className="text-muted">View and filter attendance records with summaries.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="card">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-sm text-muted">Total Records</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-green-600">{summary.present}</div>
          <div className="text-sm text-muted">Present</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
          <div className="text-sm text-muted">Absent</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-yellow-600">{summary.late}</div>
          <div className="text-sm text-muted">Late</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-blue-600">{summary.leave}</div>
          <div className="text-sm text-muted">Leave</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-purple-600">{summary.halfDay}</div>
          <div className="text-sm text-muted">Half Day</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Filters</h3>
          <button type="button" className="btn-secondary text-sm" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label" htmlFor="fromDate">From Date</label>
            <input
              id="fromDate"
              type="date"
              className="input-field"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="toDate">To Date</label>
            <input
              id="toDate"
              type="date"
              className="input-field"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="batchFilter">Batch</label>
            <select
              id="batchFilter"
              className="input-field"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="studentFilter">Student</label>
            <select
              id="studentFilter"
              className="input-field"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              className="input-field"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card overflow-x-auto">
        {attendance.length === 0 ? (
          <p className="text-center text-muted py-8">No attendance records found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Coach</th>
                <th className="px-4 py-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.attendance_id} className="border-b">
                  <td className="px-4 py-3">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{record.student?.name || 'N/A'}</td>
                  <td className="px-4 py-3">{record.batch?.name || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                      record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                      record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{record.coach?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{record.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
