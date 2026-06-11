import { useState } from 'react';
import { getAdminToken } from '../../api/client';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', file: 'attendance.csv' },
  { id: 'students', label: 'Student Report', file: 'students.csv' },
  { id: 'fees', label: 'Fee / Revenue Report', file: 'fees.csv' }
];

export default function ReportsPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  const download = async (file) => {
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params}` : '';
      const response = await fetch(`/api/v1/admin/reports/${file}${qs}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Report downloaded successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports & Export</h2>
        <p className="text-muted">Download CSV reports for attendance, students, and fees.</p>
      </div>
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reportFrom">From date (attendance)</label>
          <input
            id="reportFrom"
            type="date"
            className="input-field"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="reportTo">To date (attendance)</label>
          <input
            id="reportTo"
            type="date"
            className="input-field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((report) => (
          <article key={report.id} className="card flex flex-col">
            <h3 className="font-bold">{report.label}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">Excel-compatible CSV format</p>
            <button type="button" className="btn-primary mt-4" onClick={() => download(report.file)}>
              Download CSV
            </button>
          </article>
        ))}
      </div>
      {message && <p className="alert-info">{message}</p>}
    </div>
  );
}
