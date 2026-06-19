import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '$0.00';
  }
  return `$${num.toFixed(2)}`;
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
      // Fallback safely to empty objects to prevent execution breakdowns
      const data = result?.data || {};
      // Ensure all required fields exist with default values
      setMetrics({
        total_revenue: data.total_revenue ?? 0,
        active_coach_count: data.active_coach_count ?? 0,
        active_student_count: data.active_student_count ?? 0,
        total_batches: data.total_batches ?? 0,
        attendance_percent: data.attendance_percent ?? 0,
        payment_summary: {
          paid_students: data.payment_summary?.paid_students ?? 0,
          unpaid_students: data.payment_summary?.unpaid_students ?? 0,
        },
        pending_dues: data.pending_dues ?? 0,
        performance_scores_count: data.performance_scores_count ?? 0,
        daily_notes_count: data.daily_notes_count ?? 0,
        monthly_revenue: data.monthly_revenue ?? 0,
        monthly_attendance: data.monthly_attendance ?? 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to communicate with analytics backend runtime engine.');
      // Set default metrics on error to prevent crashes
      setMetrics({
        total_revenue: 0,
        active_coach_count: 0,
        active_student_count: 0,
        total_batches: 0,
        attendance_percent: 0,
        payment_summary: {
          paid_students: 0,
          unpaid_students: 0,
        },
        pending_dues: 0,
        performance_scores_count: 0,
        daily_notes_count: 0,
        monthly_revenue: 0,
        monthly_attendance: 0,
      });
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
    return (
      <div className="space-y-4 p-4">
        <p className="alert-error">{error}</p>
        <button type="button" className="btn-primary" onClick={loadAnalytics}>
          Retry Connection
        </button>
      </div>
    );
  }

  // Fallback defaults built inline to keep layout fields fully safe from "undefined" crashes
  const safeMetrics = metrics || {};
  const summary = safeMetrics.payment_summary || { paid_students: 0, unpaid_students: 0 };

  return (
    <div className="bg-surface min-h-screen space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-foreground text-2xl font-bold">Academy Analytics</h2>
          <p className="text-muted text-sm">
            KPI aggregates for active records only (is_deleted: false).
          </p>
        </div>
        <motion.button
          type="button"
          className="btn-secondary"
          onClick={loadAnalytics}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Refresh
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <motion.div
          className="kpi-card border-l-success border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Total Revenue</span>
          <span className="kpi-value text-success">
            {formatCurrency(safeMetrics.total_revenue)}
          </span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-purple border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Active Coaches</span>
          <span className="kpi-value text-purple">{safeMetrics.active_coach_count ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-blue border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Active Students</span>
          <span className="kpi-value text-blue">{safeMetrics.active_student_count ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-cyan border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Total Batches</span>
          <span className="kpi-value text-cyan">{safeMetrics.total_batches ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-success border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Paid Students</span>
          <span className="kpi-value text-success">{summary.paid_students ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-amber border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Unpaid Students</span>
          <span className="kpi-value text-amber">{summary.unpaid_students ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-orange border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Attendance % (30d)</span>
          <span className="kpi-value text-orange">{safeMetrics.attendance_percent ?? 0}%</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-red border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Pending Dues</span>
          <span className="kpi-value text-danger">
            {formatCurrency(safeMetrics.pending_dues ?? 0)}
          </span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-purple border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Performance Scores</span>
          <span className="kpi-value text-purple">{safeMetrics.performance_scores_count ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-blue border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.55 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">Daily Notes</span>
          <span className="kpi-value text-blue">{safeMetrics.daily_notes_count ?? 0}</span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-success border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">This Month Revenue</span>
          <span className="kpi-value text-success">
            {formatCurrency(safeMetrics.monthly_revenue ?? 0)}
          </span>
        </motion.div>

        <motion.div
          className="kpi-card border-l-orange border-l-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.65 }}
          whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
        >
          <span className="kpi-label">This Month Attendance</span>
          <span className="kpi-value text-orange">{safeMetrics.monthly_attendance ?? 0}</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <h3 className="text-foreground text-sm font-bold">Workspace Overview</h3>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Revenue sums completed payments across your academy tenant boundary. Coach and student
          counts reflect live operational records excluding soft-deleted archives.
        </p>
      </motion.div>
    </div>
  );
}
