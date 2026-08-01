import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { parentGet, parentPatch } from '../../../api/client';
import { ChevronLeft, Calendar, User, Clock, AlertCircle, FileText, Download } from 'lucide-react';
import Loader from '../../../components/Loader';

const CATEGORY_COLORS = {
  ANNOUNCEMENT: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
  HOLIDAY: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  FEE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  COMPETITION: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  TRAINING: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  MAINTENANCE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  GENERAL: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  SPORTS_EVENT: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  EMERGENCY: 'bg-rose-500/20 text-rose-600 border-rose-500/30'
};

const PRIORITY_COLORS = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
  NORMAL: 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400',
  HIGH: 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400',
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
};

export default function ParentAnnouncementDetails() {
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
      const response = await parentGet(`/parent/announcements/${id}`);
      if (response?.data) {
        setAnnouncement(response.data);
        // Mark as read automatically
        if (!response.data.readStatuses?.[0]?.is_read) {
          await parentPatch(`/parent/announcements/${id}/read`);
        }
      }
    } catch (error) {
      setError('Failed to fetch announcement details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          {error || 'Announcement not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto font-sans p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        {/* Back Link */}
        <button
          onClick={() => navigate('/parent/announcements')}
          className="text-xs font-black uppercase text-primary hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Back to Announcements
        </button>

        {/* Header Title Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
              {announcement.title}
            </h1>
            
            <div className="flex gap-1.5 shrink-0 self-start sm:self-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${CATEGORY_COLORS[announcement.category] || CATEGORY_COLORS.GENERAL}`}>
                {announcement.category}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${PRIORITY_COLORS[announcement.priority] || PRIORITY_COLORS.NORMAL}`}>
                {announcement.priority}
              </span>
            </div>
          </div>

          <div className="prose max-w-none text-xs font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {announcement.message}
          </div>
        </div>

        {/* Attachments Card */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Uploaded Attachments</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {announcement.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/30 border border-border/50 p-3.5 rounded-xl text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{attachment.file_name}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 shadow-sm"
                  >
                    <Download size={12} className="text-primary" />
                    Download File
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Details Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5 text-xs font-semibold">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground pb-2 border-b border-border/40">Bulletin Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-foreground">
            <div className="flex gap-2.5 items-center">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] text-muted-foreground block uppercase">Sender Authority</span>
                <span className="block mt-0.5">{announcement.sender_type || 'Academy Administrator'}</span>
              </div>
            </div>
            <div className="flex gap-2.5 items-center">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] text-muted-foreground block uppercase">Created Date</span>
                <span className="block mt-0.5">{new Date(announcement.created_at).toLocaleString()}</span>
              </div>
            </div>
            {announcement.published_at && (
              <div className="flex gap-2.5 items-center">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-[9px] text-muted-foreground block uppercase">Published Date</span>
                  <span className="block mt-0.5">{new Date(announcement.published_at).toLocaleString()}</span>
                </div>
              </div>
            )}
            {announcement.expires_at && (
              <div className="flex gap-2.5 items-center border-t sm:border-t-0 pt-2.5 sm:pt-0">
                <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="text-[9px] text-muted-foreground block uppercase text-rose-500">Expires Date</span>
                  <span className="block mt-0.5 text-rose-600">{new Date(announcement.expires_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Back Trigger */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/parent/announcements')}
            className="w-full btn btn-secondary text-xs py-3"
          >
            Back to Bulletins
          </button>
        </div>
      </motion.div>
    </div>
  );
}
