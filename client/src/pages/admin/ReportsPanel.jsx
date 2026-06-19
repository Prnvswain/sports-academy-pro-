import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAdminToken } from '../../api/client';

const REPORTS = [
  {
    id: 'attendance',
    label: 'Attendance Report',
    csvFile: 'attendance.csv',
    pdfFile: 'attendance.pdf',
  },
  { id: 'students', label: 'Student Report', csvFile: 'students.csv', pdfFile: 'students.pdf' },
  { id: 'fees', label: 'Fee / Revenue Report', csvFile: 'fees.csv', pdfFile: 'fees.pdf' },
  { id: 'coaches', label: 'Coach Report', csvFile: 'coaches.csv', pdfFile: 'coaches.pdf' },
  { id: 'batches', label: 'Batch Report', csvFile: 'batches.csv', pdfFile: 'batches.pdf' },
];

export default function ReportsPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  const download = async (file, format = 'csv') => {
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params}` : '';
      const response = await fetch(`/api/v1/admin/reports/${file}${qs}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`${format.toUpperCase()} report downloaded successfully.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Reports & Export</h2>
        <p className="text-muted">Download CSV reports for attendance, students, and fees.</p>
      </div>
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reportFrom">
            From date (attendance)
          </label>
          <motion.input
            id="reportFrom"
            type="date"
            className="input-field"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            whileFocus={{ scale: 1.01 }}
          />
        </div>
        <div>
          <label className="label" htmlFor="reportTo">
            To date (attendance)
          </label>
          <motion.input
            id="reportTo"
            type="date"
            className="input-field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            whileFocus={{ scale: 1.01 }}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((report, index) => (
          <motion.article
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
            className={`kpi-card flex flex-col ${
              index % 5 === 0
                ? 'border-l-orange border-l-4'
                : index % 5 === 1
                  ? 'border-l-blue border-l-4'
                  : index % 5 === 2
                    ? 'border-l-green border-l-4'
                    : index % 5 === 3
                      ? 'border-l-purple border-l-4'
                      : 'border-l-cyan border-l-4'
            }`}
          >
            <h3 className="font-bold">{report.label}</h3>
            <p className="text-muted mt-2 flex-1 text-sm">
              Excel-compatible CSV and HTML/PDF format
            </p>
            <div className="mt-4 flex gap-2">
              <motion.button
                type="button"
                className="btn-gradient-blue flex-1"
                onClick={() => download(report.csvFile, 'csv')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Download CSV
              </motion.button>
              <motion.button
                type="button"
                className="btn-gradient-purple flex-1"
                onClick={() => download(report.pdfFile, 'pdf')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Download PDF
              </motion.button>
            </div>
          </motion.article>
        ))}
      </div>
      {message && <p className="alert-info">{message}</p>}
    </motion.div>
  );
}
