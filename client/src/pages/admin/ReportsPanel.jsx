import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet } from 'lucide-react';
import { getAdminToken } from '../../api/client';

const REPORTS = [
  { id: 'monthly-collection', label: 'Monthly Collection Report', csvFile: 'monthly-collection.csv', pdfFile: 'monthly-collection.pdf' },
  { id: 'pending-fees', label: 'Pending Fees Report', csvFile: 'pending-fees.csv', pdfFile: 'pending-fees.pdf' },
  { id: 'student-fee', label: 'Student-wise Fee Report', csvFile: 'student-fee.csv', pdfFile: 'student-fee.pdf' },
  { id: 'batch-collection', label: 'Batch-wise Collection Report', csvFile: 'batch-collection.csv', pdfFile: 'batch-collection.pdf' },
];

const CARD_COLORS = [
  'var(--color-accent-primary)',
  'var(--color-blue-primary)',
  'var(--color-amber-primary)',
  'var(--color-purple-primary)'
];

export default function ReportsPanel() {
  const [message, setMessage] = useState('');

  const download = async (file, format = 'csv') => {
    setMessage('');
    try {
      const response = await fetch(`/api/v1/admin/reports/${file}`, {
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
      className="space-y-6 w-full max-w-7xl mx-auto overflow-x-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <FileSpreadsheet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Reports & Export
            </h1>
            <p className="text-muted-foreground mt-1">
              Download CSV and PDF reports for collection, outstanding dues, student balances, and batch revenue.
            </p>
          </div>
        </div>
      </motion.div>

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