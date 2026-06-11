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
        <p className="alert-error p-3 bg-red-100 text-red-700 rounded-md">{error}</p>
        <button type="button" className="btn-primary px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-all duration-300" onClick={loadAnalytics}>
          Retry Connection
        </button>
      </div>
    );
  }

  // Fallback defaults built inline to keep layout fields fully safe from "undefined" crashes
  const safeMetrics = metrics || {};
  const summary = safeMetrics.payment_summary || { paid_students: 0, unpaid_students: 0 };

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academy Analytics</h2>
          <p className="text-sm text-slate-600">KPI aggregates for active records only (is_deleted: false).</p>
        </div>
        <button type="button" className="px-4 py-2 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-100 hover:text-emerald-700 transition-all duration-300" onClick={loadAnalytics}>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(safeMetrics.total_revenue)}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Coaches</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{safeMetrics.active_coach_count ?? 0}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Students</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{safeMetrics.active_student_count ?? 0}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Batches</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{safeMetrics.total_batches ?? 0}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Students</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1">{summary.paid_students ?? 0}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unpaid Students</span>
          <span className="text-2xl font-bold text-amber-600 mt-1">{summary.unpaid_students ?? 0}</span>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance % (30d)</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1">{safeMetrics.attendance_percent ?? 0}%</span>
        </div>
      </div>

      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm">Workspace Overview</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Revenue sums completed payments across your academy tenant boundary. Coach and student counts
          reflect live operational records excluding soft-deleted archives.
        </p>
      </div>
    </div>
  );
}