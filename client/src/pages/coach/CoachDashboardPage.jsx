import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit } from 'lucide-react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { coachGet } from '../../api/client';
import { useState, useEffect, useMemo } from 'react';

export default function CoachDashboardPage() {
  const { dashboard, batches, loading, error } = useCoachBatches();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Load persisted filters
  useEffect(() => {
    const savedSearch = localStorage.getItem('coach_dashboard_search');
    const savedSport = localStorage.getItem('coach_dashboard_sport');
    if (savedSearch) setSearchQuery(savedSearch);
    if (savedSport) setSelectedSport(savedSport);
  }, []);

  // Save filters on change
  useEffect(() => {
    localStorage.setItem('coach_dashboard_search', searchQuery);
    localStorage.setItem('coach_dashboard_sport', selectedSport);
  }, [searchQuery, selectedSport]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const result = await coachGet('/coach/notifications');
        setNotifications(result.data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    };
    loadNotifications();
  }, []);

  // Load students from coach's batches
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setStudentsLoading(true);
        const result = await coachGet('/coach/students-fee-summary');
        setStudents(result.data?.students || []);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setStudentsLoading(false);
      }
    };
    loadStudents();
  }, []);

  // Load active batch sessions
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        setSessionsLoading(true);
        const result = await coachGet('/coach/batch-session/active');
        setActiveSessions(result.data || []);
      } catch (err) {
        console.error('Failed to load active sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };
    loadActiveSessions();
    
    // Refresh every minute
    const interval = setInterval(loadActiveSessions, 60000);
    return () => clearInterval(interval);
  }, []);


  // Get unique sports from batches
  const uniqueSports = useMemo(() => {
    const sports = new Set(batches.map(b => b.sport?.name).filter(Boolean));
    return Array.from(sports).sort();
  }, [batches]);

  // Filter batches based on search and sport
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const matchesSearch = searchQuery === '' || 
        batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (batch.sport?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSport = selectedSport === 'all' || batch.sport?.name === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [batches, searchQuery, selectedSport]);

  // Find next upcoming batch
  const nextUpcomingBatch = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    
    // Simple logic: find first batch with timing today (would need better parsing in production)
    return batches.find(batch => {
      if (!batch.timing) return false;
      // This is a simplified check - in production you'd parse the timing string
      return batch.students?.length > 0;
    });
  }, [batches]);

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
      <div className="p-6 space-y-8">
        {/* Dashboard Cards Skeleton */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-4 bg-surface-secondary rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-surface-secondary rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Batches Section Skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-surface-secondary rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-surface-secondary rounded w-64 animate-pulse"></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-4">
                <div className="h-6 bg-surface-secondary rounded w-3/4 animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-surface-secondary rounded w-20 animate-pulse"></div>
                  <div className="h-6 bg-surface-secondary rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-4 bg-surface-secondary rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications Skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-surface-secondary rounded w-48 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="h-4 bg-surface-secondary rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-surface-secondary rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
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
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-5"
          >
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/coach/profile')}
              className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-primary bg-gradient-to-br from-surface to-primary/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center">
                 <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Coach Profile</span>
                 <span className="text-2xl opacity-80">👤</span>
              </div>
              <span className="text-2xl font-black text-foreground drop-shadow-sm truncate">{dashboard.coach_name}</span>
            </motion.div>
            
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/coach/academy')}
              className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-blue bg-gradient-to-br from-surface to-blue/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center">
                 <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue">Academy</span>
                 <span className="text-2xl opacity-80">🏛️</span>
              </div>
              <span className="text-2xl font-black text-foreground drop-shadow-sm truncate">{dashboard.academy_name}</span>
            </motion.div>
            
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/coach/students')}
              className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-purple bg-gradient-to-br from-surface to-purple/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple">Today&apos;s Students</span>
                <span className="text-2xl opacity-80">🎓</span>
              </div>
              <span className="text-4xl font-black text-purple drop-shadow-sm">{dashboard.todays_students ?? 0}</span>
            </motion.div>
            
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/coach/fees?status=pending')}
              className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-warning bg-gradient-to-br from-surface to-warning/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-warning flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span> Pending Fees
                </span>
                <span className="text-2xl opacity-80">⚠️</span>
              </div>
              <span className="text-4xl font-black text-warning drop-shadow-sm">{dashboard.pending_fees_count ?? 0}</span>
            </motion.div>

            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/coach/attendance')}
              className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-emerald bg-gradient-to-br from-surface to-emerald/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald">Today's Attendance</span>
                <span className="text-2xl opacity-80">✅</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald drop-shadow-sm">
                  {dashboard.attendance_summary?.present_today ?? 0}
                </span>
                <span className="text-sm text-muted-foreground">/ {dashboard.attendance_summary?.marked_today ?? 0}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {dashboard.attendance_summary?.rate_percent ?? 0}% present
              </span>
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

          {/* Search and Filter */}
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Sports</option>
              {uniqueSports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>

          {/* Next Upcoming Batch */}
          {nextUpcomingBatch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <div className="text-sm font-bold text-foreground">Next Upcoming Batch</div>
                    <div className="text-xs text-muted-foreground">{nextUpcomingBatch.name} • {nextUpcomingBatch.timing}</div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/coach/attendance?batch_id=${nextUpcomingBatch.batch_id}`)}
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Start Attendance
                </motion.button>
              </div>
            </motion.div>
          )}

          {filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-surface-secondary/10 rounded-2xl border border-dashed border-border">
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="h-20 w-20 mb-5 rounded-full bg-surface shadow-inner border border-border/50 flex items-center justify-center text-3xl"
              >
                🏋️‍♂️
              </motion.div>
              <h3 className="text-xl font-bold text-foreground">No batches found</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {searchQuery || selectedSport !== 'all' ? 'Try adjusting your search or filters.' : 'You currently don\'t have any active batches assigned to you.'}
              </p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredBatches.map((batch) => {
                const activeSession = activeSessions.find(s => s.batch_id === batch.batch_id);
                const batchStatus = activeSession ? 'LIVE' : 'SCHEDULED';
                
                return (
                  <motion.article 
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedBatch(batch);
                      setShowBatchDetails(true);
                    }}
                    key={batch.batch_id} 
                    className="card p-0 overflow-hidden bg-surface/60 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all group cursor-pointer"
                  >
                    <div className="p-5 border-b border-border/40 bg-gradient-to-r from-surface to-surface-secondary">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                          {batch.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {batchStatus === 'LIVE' && (
                            <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                              LIVE
                            </span>
                          )}
                          <span className="text-xs opacity-50">#{(batch.batch_id).toString().slice(-4)}</span>
                          <span className="text-xs">→</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] text-xs font-bold">
                          {batch.sport?.globalSport?.icon || '⚽'} {batch.sport?.name || 'Unknown Sport'}
                        </span>
                        <span className="badge bg-blue/10 text-blue border border-blue/20 text-xs font-bold">
                          🕒 {batch.timing || 'No Time Set'}
                        </span>
                        <span className={`badge text-xs font-bold ${
                          batchStatus === 'LIVE' 
                            ? 'bg-red-10 text-red border border-red/20' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {batchStatus}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-sm font-semibold text-muted-foreground">Enrolled Students</span>
                        <span className="flex items-center justify-center bg-surface-secondary border border-border rounded-full h-8 px-3 text-sm font-black text-foreground">
                          {(batch.students_count || batch.students?.length) ?? 0}
                        </span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </motion.section>

        {/* Students Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl">🎓</span> My Students
            </h2>
            <Link to="/coach/students" className="text-sm text-primary hover:text-primary/80 font-semibold">
              View All →
            </Link>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-secondary/10 rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-4">👥</span>
              <h3 className="text-lg font-bold text-foreground">No students found</h3>
              <p className="text-sm text-muted-foreground mt-2">No students enrolled in your assigned batches yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3">Name</th>
                    <th className="px-2 pb-3">Age</th>
                    <th className="px-2 pb-3">Sport</th>
                    <th className="px-2 pb-3">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Attendance
                    </th>
                    <th className="px-2 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {students.slice(0, 5).map((student, index) => {
                    const isInactive = student.status?.toUpperCase() !== 'ACTIVE' && !student.isActive;
                    return (
                      <motion.tr
                        key={student.student_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                        className={`text-foreground cursor-pointer ${isInactive ? 'opacity-60 bg-gray-50' : ''}`}
                        onClick={() => navigate(`/coach/students/${student.student_id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar src={student.profile_photo} name={student.name} size="sm" />
                            <div>
                              <p className="font-semibold">{student.name}</p>
                              {student.parent_email && (
                                <p className="text-muted text-xs">{student.parent_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-muted">{student.age || '—'}</td>
                        <td>
                          {student.sport?.name || student.enrollments?.[0]?.sport?.name || '—'}
                        </td>
                        <td className="text-muted">
                          {student.batch?.name || student.enrollments?.[0]?.batch?.name || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {student.status?.toUpperCase() === 'ACTIVE' || student.isActive ? (
                            <span className="badge-active">ACTIVE</span>
                          ) : (
                            <span className="badge-inactive">INACTIVE</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="text-emerald-600">
                              {student.attendance_summary?.present_count || 0}
                            </span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-rose-600">
                              {student.attendance_summary?.absent_count || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              onClick={() => navigate(`/coach/students/${student.student_id}`)}
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                              onClick={() => navigate(`/coach/students/${student.student_id}/edit`)}
                              title="Edit Student"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        {/* Recent Notifications */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl">🔔</span> Recent Notifications
            </h2>
            {notifications.length > 0 && (
              <Link to="/coach/notifications" className="text-sm text-primary hover:text-primary/80 font-semibold">
                View All →
              </Link>
            )}
          </div>

          {notificationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-secondary/10 rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-4">📭</span>
              <h3 className="text-lg font-bold text-foreground">No notifications</h3>
              <p className="text-sm text-muted-foreground mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <motion.div
                  key={notification.notification_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-xl border transition-all ${
                    notification.is_read 
                      ? 'bg-surface-secondary/30 border-border/50 opacity-70' 
                      : 'bg-surface border-border/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.is_read ? 'bg-muted-foreground' : 'bg-primary animate-pulse'}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-foreground">{notification.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                      {notification.metadata && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {typeof notification.metadata === 'string' 
                            ? notification.metadata 
                            : JSON.stringify(notification.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Batch Details Modal */}
        <AnimatePresence>
          {showBatchDetails && selectedBatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowBatchDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-foreground">{selectedBatch.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedBatch.sport?.name} • {selectedBatch.timing}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBatchDetails(false)}
                      className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-surface-secondary/50 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Total Students</div>
                      <div className="text-2xl font-black text-foreground">{(selectedBatch.students_count || selectedBatch.students?.length) ?? 0}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-secondary/50 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Sport</div>
                      <div className="text-2xl font-black text-foreground">{selectedBatch.sport?.name || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(`/coach/attendance?batch_id=${selectedBatch.batch_id}`);
                          setShowBatchDetails(false);
                        }}
                        className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-left hover:bg-primary/20 transition-colors"
                      >
                        <div className="text-lg mb-1">📋</div>
                        <div className="text-sm font-bold text-foreground">Mark Attendance</div>
                        <div className="text-xs text-muted-foreground">Take today's attendance</div>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(`/coach/students?batch_id=${selectedBatch.batch_id}`);
                          setShowBatchDetails(false);
                        }}
                        className="p-4 rounded-xl bg-blue/10 border border-blue/30 text-left hover:bg-blue/20 transition-colors"
                      >
                        <div className="text-lg mb-1">👥</div>
                        <div className="text-sm font-bold text-foreground">View Students</div>
                        <div className="text-xs text-muted-foreground">See enrolled students</div>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(`/coach/fees?batch_id=${selectedBatch.batch_id}`);
                          setShowBatchDetails(false);
                        }}
                        className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-left hover:bg-warning/20 transition-colors"
                      >
                        <div className="text-lg mb-1">💳</div>
                        <div className="text-sm font-bold text-foreground">View Fees</div>
                        <div className="text-xs text-muted-foreground">Fee status & payments</div>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigate(`/coach/performance?batch_id=${selectedBatch.batch_id}`);
                          setShowBatchDetails(false);
                        }}
                        className="p-4 rounded-xl bg-purple/10 border border-purple/30 text-left hover:bg-purple/20 transition-colors"
                      >
                        <div className="text-lg mb-1">📈</div>
                        <div className="text-sm font-bold text-foreground">Performance</div>
                        <div className="text-xs text-muted-foreground">Track progress</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Student List */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3">Enrolled Students</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedBatch.students?.length > 0 ? (
                        selectedBatch.students.map((student) => (
                          <div key={student.student_id} className="p-3 rounded-lg bg-surface-secondary/30 border border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {student.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-foreground">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.sport?.name}</div>
                              </div>
                            </div>
                            <span className="badge bg-emerald/10 text-emerald border border-emerald/20 text-xs font-bold">
                              Active
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">No students enrolled</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}