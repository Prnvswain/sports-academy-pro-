import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { CoachDailyNotes } from './CoachExtras';

export default function CoachNotesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return <Loader message="Loading students…" />;
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-zinc-900">Daily Student Notes</h2>
          <span className="text-red-500 text-2xl">📝</span>
        </div>
        <p className="text-sm text-zinc-400 mt-1">Daily Notes</p>
      </div>
      <CoachDailyNotes students={allStudents} />
    </div>
  );
}
