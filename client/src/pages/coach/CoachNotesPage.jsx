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
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Daily Student Notes
            </h1>
            <p className="text-muted-foreground mt-1">
              Write performance and behavior updates that are instantly shared with parents.
            </p>
          </div>
        </div>
      </motion.div>

      <CoachDailyNotes students={allStudents} />
    </div>
  );
}
