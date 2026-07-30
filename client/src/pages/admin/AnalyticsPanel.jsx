import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2 } from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return '₹0.00';
  }
  return `₹${num.toFixed(2)}`;
}

export default function AnalyticsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminGet('/admin/analytics');
      setMetrics(result.data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <Loader message="Loading academy analytics…" />;
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  const summary = metrics.payment_summary || {};

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Academy Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              KPI aggregates for active records only (is_deleted: false).
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={loadAnalytics}>
          Refresh
        </button>
      </motion.div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 w-full">
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Total Revenue</span>
          <span className="kpi-value">{formatCurrency(metrics.total_revenue)}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Active Coaches</span>
          <span className="kpi-value">{metrics.active_coach_count ?? 0}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Active Students</span>
          <span className="kpi-value">{metrics.active_student_count ?? 0}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Total Batches</span>
          <span className="kpi-value">{metrics.total_batches ?? 0}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Paid Students</span>
          <span className="kpi-value">{summary.paid_students ?? 0}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Unpaid Students</span>
          <span className="kpi-value">{summary.unpaid_students ?? 0}</span>
        </div>
        <div className="card bg-surface-secondary">
          <span className="kpi-label">Attendance % (30d)</span>
          <span className="kpi-value">{metrics.attendance_percent ?? 0}%</span>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold">Workspace Overview</h3>
        <p className="mt-2 text-sm text-muted">
          Revenue sums completed payments across your academy tenant boundary. Coach and student counts
          reflect live operational records excluding soft-deleted archives.
        </p>
      </div>
    </div>
  );
}
