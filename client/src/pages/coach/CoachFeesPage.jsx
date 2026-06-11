import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { CoachFeeCollection } from './CoachExtras';

export default function CoachFeesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return <Loader message="Loading students…" />;
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Fee Collection</h2>
      <CoachFeeCollection students={allStudents} />
    </div>
  );
}
