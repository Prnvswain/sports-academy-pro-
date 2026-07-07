import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';

export default function CoachDashboardPage() {
  const { dashboard, batches, loading, error } = useCoachBatches();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-sm font-semibold text-muted-foreground">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        Loading coach dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert-error border-danger/30 bg-danger/10 text-danger rounded-xl p-4 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full">
 {/* Subtle Sports Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.04] dark:opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sports-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
              {/* Football / Soccer */}
              <g transform="translate(20, 20) scale(1.2)">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 7l-3 4h6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 7V2m-3 9l-4 3m10-3l4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
              
              {/* Basketball */}
              <g transform="translate(120, 40) scale(1.2)">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2v20M2 12h20M4.93 4.93c3.9 3.9 3.9 10.24 0 14.14M19.07 4.93c-3.9 3.9-3.9 10.24 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </g>

              {/* Whistle */}
              <g transform="translate(40, 120) scale(1.2)">
                <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0a6.002 6.002 0 0 0-5.183-5.949V3.75a.75.75 0 1 0-1.5 0v3.051A6.002 6.002 0 0 0 6 11.25v1.5m12 0h-3m-9 0H3m12 0c0 .966-.316 1.857-.847 2.573m-10.306 0A4.502 4.502 0 0 1 6 12.75v-1.5c0-.966.316-1.857.847-2.573" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Dumbbell / Weight */}
              <g transform="translate(140, 140) scale(1.2)">
                <path d="M6 4v16M18 4v16M4 8h16M4 16h16M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sports-icons)" />
        </svg>
      </div>

      <motion.div
        className="relative z-10 space-y-8 p-6 w-full overflow-x-hidden bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative">
          <div className="absolute top-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              Overview
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>

        {dashboard && (
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-primary bg-gradient-to-br from-surface to-primary/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                 <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Coach Profile</span>
                 <span className="text-2xl opacity-80">👤</span>
              </div>
              <span className="text-2xl font-black text-foreground drop-shadow-sm truncate">{dashboard.coach_name}</span>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-blue bg-gradient-to-br from-surface to-blue/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                 <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue">Academy</span>
                 <span className="text-2xl opacity-80">🏛️</span>
              </div>
              <span className="text-2xl font-black text-foreground drop-shadow-sm truncate">{dashboard.academy_name}</span>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-purple bg-gradient-to-br from-surface to-purple/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple">Today&apos;s Students</span>
                <span className="text-2xl opacity-80">🎓</span>
              </div>
              <span className="text-4xl font-black text-purple drop-shadow-sm">{dashboard.todays_students ?? 0}</span>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.02 }} className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-warning bg-gradient-to-br from-surface to-warning/5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-warning flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span> Pending Fees
                </span>
                <span className="text-2xl opacity-80">⚠️</span>
              </div>
              <span className="text-4xl font-black text-warning drop-shadow-sm">{dashboard.pending_fees_count ?? 0}</span>
            </motion.div>
          </motion.section>
        )}

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl">📋</span> Assigned Batches
            </h2>
            <Link to="/coach/attendance" className="inline-block">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(var(--color-accent-primary), 0.4)" }} 
                whileTap={{ scale: 0.97 }}
                className="btn-primary bg-gradient-to-r from-primary to-accent-hover border-transparent shadow-lg text-sm px-6 py-2.5"
              >
                ✓ Mark Attendance
              </motion.button>
            </Link>
          </div>

          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-surface-secondary/10 rounded-2xl border border-dashed border-border">
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="h-20 w-20 mb-5 rounded-full bg-surface shadow-inner border border-border/50 flex items-center justify-center text-3xl"
              >
                🏋️‍♂️
              </motion.div>
              <h3 className="text-xl font-bold text-foreground">No batches assigned</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                You currently don't have any active batches assigned to you.
              </p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {batches.map((batch) => (
                <motion.article 
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.01 }}
                  key={batch.batch_id} 
                  className="card p-0 overflow-hidden bg-surface/60 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all group"
                >
                  <div className="p-5 border-b border-border/40 bg-gradient-to-r from-surface to-surface-secondary">
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      {batch.name}
                      <span className="text-sm opacity-50">#{(batch.batch_id).toString().slice(-4)}</span>
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] text-xs font-bold">
                        ⚽ {batch.sport?.name || 'Unknown Sport'}
                      </span>
                      <span className="badge bg-blue/10 text-blue border border-blue/20 text-xs font-bold">
                        🕒 {batch.timing || 'No Time Set'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-sm font-semibold text-muted-foreground">Enrolled Students</span>
                      <span className="flex items-center justify-center bg-surface-secondary border border-border rounded-full h-8 px-3 text-sm font-black text-foreground">
                        {batch.students?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}