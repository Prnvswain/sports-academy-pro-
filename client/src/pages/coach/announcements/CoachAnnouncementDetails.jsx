import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { coachGet } from '../../../api/client';
import { Megaphone, ArrowLeft, BarChart2, Calendar, Users, Eye, FileText, CheckCircle2 } from 'lucide-react';

const CATEGORY_COLORS = {
  ANNOUNCEMENT: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  URGENT: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  HOLIDAY: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  TRAINING: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  COMPETITION: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  GENERAL: 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
};

const PRIORITY_COLORS = {
  LOW: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
  NORMAL: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  HIGH: 'bg-amber-500/10 text-amber-605 border border-amber-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
};

export default function CoachAnnouncementDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const response = await coachGet(`/coach/announcements/${id}`);
      if (response?.data) {
        setAnnouncement(response.data);
      }
    } catch (error) {
      setError('Failed to fetch announcement details');
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

  if (error || !announcement) {
    return (
      <div className="p-2 text-left">
        <div className="alert alert-error">
          {error || 'Announcement not found'}
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
        className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">{announcement.title}</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              Detailed breakdown of broadcast analytics and target metrics.
            </p>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/coach/announcements')}
          className="btn btn-secondary text-xs flex items-center gap-1.5 self-end sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
      </motion.div>

      {/* Badges details bar */}
      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${CATEGORY_COLORS[announcement.category]}`}>
          {announcement.category}
        </span>
        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${PRIORITY_COLORS[announcement.priority]}`}>
          {announcement.priority}
        </span>
        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-border">
          {announcement.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left main block */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Content */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/60 pb-2">Announcement Message</h3>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-semibold">{announcement.message}</p>
          </div>

          {/* Attachments Section */}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/60 pb-2">File Attachments</h3>
              <div className="space-y-2">
                {announcement.attachments.map((attachment) => (
                  <a
                    key={attachment.attachment_id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-xl hover:bg-slate-100/50 transition-colors text-xs font-bold text-foreground"
                  >
                    <span>{attachment.file_name}</span>
                    <span className="text-[10px] text-primary uppercase font-black">Download File</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right metrics panel */}
        <div className="space-y-6">
          {/* Target details card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2">Delivery Metrics</h3>
            <div className="space-y-3 font-bold text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Audience</span>
                <span className="text-foreground uppercase">{announcement.target_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Recipients</span>
                <span className="text-foreground">{announcement.total_recipients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivered Alerts</span>
                <span className="text-foreground">{announcement.delivered_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Read Count</span>
                <span className="text-foreground">{announcement.read_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created At</span>
                <span className="text-foreground">{new Date(announcement.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published At</span>
                <span className="text-foreground">
                  {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : 'Not published'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate(`/coach/announcements/${id}/stats`)}
                className="btn btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <BarChart2 className="w-4 h-4" /> View Detailed Statistics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
