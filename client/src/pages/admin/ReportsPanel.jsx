import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAdminToken } from '../../api/client';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', csvFile: 'attendance.csv', pdfFile: 'attendance.pdf' },
  { id: 'students', label: 'Student Report', csvFile: 'students.csv', pdfFile: 'students.pdf' },
  { id: 'fees', label: 'Fee / Revenue Report', csvFile: 'fees.csv', pdfFile: 'fees.pdf' },
  { id: 'coaches', label: 'Coach Report', csvFile: 'coaches.csv', pdfFile: 'coaches.pdf' },
  { id: 'batches', label: 'Batch Report', csvFile: 'batches.csv', pdfFile: 'batches.pdf' },
];

// Custom colors mapped from our index.css variables for the colourful cards
const CARD_COLORS = [
  'var(--color-accent-primary)', // Greenish
  'var(--color-blue-primary)',   // Blue
  'var(--color-amber-primary)',  // Amber/Orange
  'var(--color-purple-primary)', // Purple
  'var(--color-cyan-primary)'    // Cyan
];

export default function ReportsPanel() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  // No logic changed here, completely intact.
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
      className="space-y-8 w-full max-w-7xl mx-auto overflow-x-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Reports & Export</h2>
        {/* Fixed: text-muted to text-muted-foreground for visibility */}
        <p className="text-base text-muted-foreground mt-1">
          Download CSV and PDF reports for attendance, students, and fees.
        </p>
      </div>

      {/* Date Pickers Section */}
      <div className="card">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground tracking-wide" htmlFor="reportFrom">
              From date (attendance)
            </label>
            <motion.input
              id="reportFrom"
              type="date"
              className="input-field"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              whileFocus={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground tracking-wide" htmlFor="reportTo">
              To date (attendance)
            </label>
            <motion.input
              id="reportTo"
              type="date"
              className="input-field"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              whileFocus={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report, index) => {
          const themeColor = `rgb(${CARD_COLORS[index % CARD_COLORS.length]})`;
          
          return (
            <motion.article
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, type: 'spring', bounce: 0 }}
              whileHover={{ y: -5 }}
              className="card flex flex-col h-full relative overflow-hidden group"
              style={{ borderTopWidth: '4px', borderTopColor: themeColor }}
            >
              {/* Colorful Ambient Glow inside the card */}
              <div 
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-10 transition-opacity duration-500 group-hover:opacity-25"
                style={{ backgroundColor: themeColor }}
              />

              <div className="mb-6 relative z-10">
                <h3 className="text-xl font-bold text-foreground">{report.label}</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Excel-compatible CSV and HTML/PDF format
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto flex gap-3 pt-5 border-t border-border/50 relative z-10">
                <motion.button
                  type="button"
                  className="btn btn-secondary flex-1 text-xs"
                  onClick={() => download(report.csvFile, 'csv')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ '--hover-color': themeColor }}
                >
                  Download CSV
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-secondary flex-1 text-xs"
                  onClick={() => download(report.pdfFile, 'pdf')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Download PDF
                </motion.button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Dynamic Alert Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={message.includes('failed') || message.includes('error') ? 'alert-error' : 'alert-success'}
        >
          {message}
        </motion.div>
      )}
    </motion.div>
  );
}