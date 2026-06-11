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
      <h2 className="mb-4 text-2xl font-bold">Daily Student Notes</h2>
      <CoachDailyNotes students={allStudents} />
    </div>
  );
}
