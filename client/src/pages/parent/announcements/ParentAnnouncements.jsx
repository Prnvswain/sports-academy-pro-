import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { parentGet, parentPatch } from '../../../api/client';
import { useActiveStudent } from '../../../context/ActiveStudentContext';
import { Megaphone, Search, AlertCircle, FileText, CheckCheck, ArrowRight, ShieldAlert, Tag, Bell } from 'lucide-react';
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

export default function ParentAnnouncements() {
  const navigate = useNavigate();
  const { activeStudent, loading: studentLoading } = useActiveStudent();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, [filter, activeStudent]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.append('unread_only', 'true');
      if (search) params.append('search', search);
      if (activeStudent) params.append('student_id', activeStudent.student_id);

      const response = await parentGet(`/parent/announcements?${params.toString()}`);
      
      if (response?.data?.announcements) {
        setAnnouncements(response.data.announcements);
      }
    } catch (error) {
      setError('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (announcementId) => {
    try {
      await parentPatch(`/parent/announcements/${announcementId}/read`);
      setAnnouncements(announcements.map(a => 
        a.announcement_id === announcementId 
          ? { ...a, readStatuses: [{ is_read: true }] } 
          : a
      ));
    } catch (error) {
      setError('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await parentPatch('/parent/announcements/read-all');
      setAnnouncements(announcements.map(a => ({ ...a, readStatuses: [{ is_read: true }] })));
    } catch (error) {
      setError('Failed to mark all as read');
    }
  };

  const handleViewDetails = (announcementId, announcement) => {
    handleMarkAsRead(announcementId);
    
    // If it's a payment-related announcement, redirect to Fees page with Receipts modal open
    if (announcement.category === 'PAYMENT' || (announcement.title && announcement.title.includes('Payment'))) {
      navigate('/parent/fees', { state: { openReceipts: true } });
    } else {
      navigate(`/parent/announcements/${announcementId}`);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const filteredAnnouncements = filter === 'read' 
    ? announcements.filter(a => a.readStatuses?.[0]?.is_read)
    : filter === 'unread'
    ? announcements.filter(a => !a.readStatuses?.[0]?.is_read)
    : announcements;

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto font-sans p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Announcements</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">View broadcast bulletins from your academy</p>
            </div>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-black uppercase text-primary hover:text-emerald-600 transition-colors flex items-center gap-1 self-start sm:self-center"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filter controls and Search Bar in single row */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex bg-muted/40 p-1 rounded-xl border border-border/50 w-full md:w-auto">
            {['all', 'unread', 'read'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  filter === tab 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search announcements..."
              className="pl-9 pr-4 py-2 w-full input-field text-xs"
            />
          </form>
        </div>

        {/* Announcements list */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <Bell className="w-10 h-10 text-muted-foreground/30 mb-2 animate-bounce" />
            <p className="text-sm font-bold text-foreground">No announcements found</p>
            <p className="text-xs text-muted-foreground mt-0.5">We couldn't find any notifications matching the filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const isRead = announcement.readStatuses?.[0]?.is_read;
              return (
                <motion.div
                  key={announcement.announcement_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2, scale: 1.005 }}
                  onClick={() => handleViewDetails(announcement.announcement_id, announcement)}
                  className={`bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col gap-3 ${
                    !isRead ? 'border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                          {announcement.title}
                          {!isRead && <span className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                        </h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Published: {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-1.5 items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${CATEGORY_COLORS[announcement.category] || CATEGORY_COLORS.GENERAL}`}>
                        {announcement.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[announcement.priority] || PRIORITY_COLORS.NORMAL}`}>
                        {announcement.priority}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                    {announcement.message}
                  </p>

                  <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px] text-muted-foreground font-semibold">
                    <div className="flex items-center gap-3">
                      <span>Sender: <strong className="text-foreground">{announcement.sender_type || 'Admin'}</strong></span>
                      {announcement.attachments && announcement.attachments.length > 0 && (
                        <span className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded border border-border/50 text-[9px]">
                          <FileText size={10} />
                          {announcement.attachments.length} attachment{announcement.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    <span className="text-primary hover:text-emerald-600 transition-colors flex items-center gap-1 font-bold">
                      Read Bulletin
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
