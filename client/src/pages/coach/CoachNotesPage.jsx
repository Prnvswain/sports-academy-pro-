import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { CoachDailyNotes } from './CoachExtras';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export default function CoachNotesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return (
      <div className="p-2 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6 text-left">
      {/* Top Bar Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3 shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Daily Student Notes</h2>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
            Write performance and behavior updates that are instantly shared with parents.
          </p>
        </div>
      </motion.div>

      <CoachDailyNotes students={allStudents} />
    </div>
  );
}
