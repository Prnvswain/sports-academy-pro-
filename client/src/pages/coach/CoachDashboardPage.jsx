import { Link } from 'react-router-dom';
import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';

export default function CoachDashboardPage() {
  const { dashboard, batches, loading, error } = useCoachBatches();

  if (loading) {
    return <Loader message="Loading coach dashboard…" />;
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  return (
    <div className="space-y-8">
      {dashboard && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="kpi-card">
            <span className="kpi-label">Coach</span>
            <span className="kpi-value text-base">{dashboard.coach_name}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Academy</span>
            <span className="kpi-value text-base">{dashboard.academy_name}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Today&apos;s Students</span>
            <span className="kpi-value">{dashboard.todays_students ?? 0}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Pending Fees</span>
            <span className="kpi-value text-warning">{dashboard.pending_fees_count ?? 0}</span>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Assigned Batches</h2>
          <Link to="/coach/attendance" className="btn-primary">
            Mark Attendance
          </Link>
        </div>
        {batches.length === 0 ? (
          <p className="card text-center text-muted">No batches assigned yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {batches.map((batch) => (
              <article key={batch.batch_id} className="card">
                <h3 className="font-bold">{batch.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {batch.timing || '—'} · {batch.sport?.name || '—'} · {batch.students?.length ?? 0}{' '}
                  students
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
