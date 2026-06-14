import { useCallback, useEffect, useState } from 'react';
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
      setMetrics(result?.data || {});
    } catch (err) {
      setError(err.message || 'Failed to communicate with analytics backend runtime engine.');
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
      <div className="p-4 space-y-4">
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
    <div className="space-y-6 p-6 bg-surface min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Academy Analytics</h2>
          <p className="text-sm text-muted">KPI aggregates for active records only (is_deleted: false).</p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadAnalytics}>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="kpi-card">
          <span className="kpi-label">Total Revenue</span>
          <span className="kpi-value">{formatCurrency(safeMetrics.total_revenue)}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Active Coaches</span>
          <span className="kpi-value">{safeMetrics.active_coach_count ?? 0}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Active Students</span>
          <span className="kpi-value">{safeMetrics.active_student_count ?? 0}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Batches</span>
          <span className="kpi-value">{safeMetrics.total_batches ?? 0}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Paid Students</span>
          <span className="kpi-value">{summary.paid_students ?? 0}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Unpaid Students</span>
          <span className="kpi-value text-warning">{summary.unpaid_students ?? 0}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Attendance % (30d)</span>
          <span className="kpi-value">{safeMetrics.attendance_percent ?? 0}%</span>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-foreground text-sm">Workspace Overview</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Revenue sums completed payments across your academy tenant boundary. Coach and student counts
          reflect live operational records excluding soft-deleted archives.
        </p>
      </div>
    </div>
  );
}