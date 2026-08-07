import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { coachGet } from '../../../api/client';
import { Megaphone, ArrowLeft, Users, CheckCircle, Eye, MailOpen } from 'lucide-react';

export default function CoachAnnouncementStats() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, [id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await coachGet(`/coach/announcements/${id}/stats`);
      if (response?.data) {
        setStats(response.data);
      }
    } catch (error) {
      setError('Failed to fetch announcement statistics');
    } finally {
      setLoading(false);
    }
  };

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

  if (error || !stats) {
    return (
      <div className="p-2 text-left">
        <div className="alert alert-error">
          {error || 'Statistics not found'}
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
            <Megaphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Announcement Statistics
            </h1>
            <p className="text-muted-foreground mt-1">
              Review receipt logs and client notification delivery details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => navigate(`/coach/announcements/${id}`)}
            className="btn btn-secondary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Announcement
          </button>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Total Recipients */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Recipients</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-foreground">{stats.total_recipients}</h3>
            <span className="text-[10px] text-muted-foreground font-bold block mt-0.5">Alerts dispatched</span>
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Delivered</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600">{stats.delivered}</h3>
            <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">Verified delivered</span>
          </div>
        </div>

        {/* Read */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Read Alerts</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-550">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600">{stats.read}</h3>
            <span className="text-[10px] text-muted-foreground font-bold block mt-0.5">Seen by users</span>
          </div>
        </div>

        {/* Unread */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Unread Alerts</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600">
              <MailOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-600">{stats.unread}</h3>
            <span className="text-[10px] text-muted-foreground font-bold block mt-0.5">Pending user read</span>
          </div>
        </div>
      </div>

      {/* Read Percentage Progress */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-left">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/60 pb-2">Read Ratio Percentage</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
              {stats.read_percentage}% read ratio
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${stats.read_percentage}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
