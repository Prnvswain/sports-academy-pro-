import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import Loader from '../../../components/Loader';
import { adminGet } from '../../../api/client';

export default function InventoryReports() {
  const [selectedReportType, setSelectedReportType] = useState('current_stock');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  const [message, setMessage] = useState({ text: '', type: '' });

  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    setError(null);
    try {
      console.log('[InventoryReports] Loading report type:', selectedReportType);
      const res = await adminGet(`/admin/inventory/reports?type=${selectedReportType}`);
      console.log('[InventoryReports] Response:', res);
      setReportData(res?.data || []);
    } catch (err) {
      console.error('[InventoryReports] Failed to fetch report:', err);
      setError(err.message || 'Failed to fetch report data');
      flashMessage(err.message || 'Failed to fetch report data', 'error');
    } finally {
      setReportLoading(false);
    }
  }, [selectedReportType]);

  useEffect(() => {
    console.log('[InventoryReports] Component mounted, loading initial report');
    loadReport();
  }, [loadReport]);

  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => Object.values(row).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReportColumns = () => {
    if (reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  };

  const handleRetry = () => {
    loadReport();
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            Reports & Ledger
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            View inventory reports and export data
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
              }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Select Report Dataset:</label>
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white font-semibold"
          >
            <option value="current_stock">Current Stock & Quantity Status</option>
            <option value="coach_wise">Coach-wise Assigned Inventory</option>
            <option value="sport_wise">Sport-wise Inventory Catalog</option>
            <option value="damaged">Damaged Equipment Audit</option>
            <option value="request_history">Coach Requests History Log</option>
            <option value="purchase_history">Procurement & Purchase Ledger</option>
            <option value="low_stock">Low Stock & Warnings Report</option>
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={reportData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition hover:scale-105 active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export Report (CSV)
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {reportLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading report data...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">Failed to Load Report</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Report Data Available</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Select a different report type or check back later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                  {getReportColumns().map((col, idx) => (
                    <th key={idx} className="p-4">{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-350">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    {getReportColumns().map((col, colIdx) => (
                      <td key={colIdx} className="p-4">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
