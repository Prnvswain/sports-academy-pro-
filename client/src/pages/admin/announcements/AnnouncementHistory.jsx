import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Search, Eye, BarChart3, Copy, Archive,
  Trash2, Users, Check, Clock, TrendingUp, AlertCircle,
  Calendar, DollarSign, Activity, Settings, Trophy, HelpCircle,
  FileText, ShieldAlert, CheckCircle2, X
} from 'lucide-react';
import { adminGet, adminDelete, adminPatch } from '../../../api/client';

const CATEGORY_DETAILS = {
  ANNOUNCEMENT: { label: 'Announcement', icon: Megaphone, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10 border' },
  URGENT: { label: 'Urgent', icon: ShieldAlert, color: 'bg-rose-500/10 text-rose-600 border-rose-500/10 border' },
  HOLIDAY: { label: 'Holiday', icon: Calendar, color: 'bg-sky-500/10 text-sky-600 border-sky-500/10 border' },
  FEE: { label: 'Fee Reminder', icon: DollarSign, color: 'bg-amber-500/10 text-amber-600 border-amber-500/10 border' },
  COMPETITION: { label: 'Competition', icon: Trophy, color: 'bg-purple-500/10 text-purple-600 border-purple-500/10 border' },
  TRAINING: { label: 'Training', icon: Activity, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10 border' },
  MAINTENANCE: { label: 'Maintenance', icon: Settings, color: 'bg-orange-500/10 text-orange-600 border-orange-500/10 border' },
  GENERAL: { label: 'General', icon: FileText, color: 'bg-slate-500/10 text-slate-600 border-slate-500/10 border' },
  SPORTS_EVENT: { label: 'Sports Event', icon: Trophy, color: 'bg-pink-500/10 text-pink-600 border-pink-500/10 border' },
  EMERGENCY: { label: 'Emergency', icon: AlertCircle, color: 'bg-red-500/15 text-red-700 border-red-550/15 border font-black' }
};

const PRIORITY_COLORS = {
  LOW: 'bg-slate-105 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 border',
  NORMAL: 'bg-blue-500/10 text-blue-600 border-blue-500/10 border',
  HIGH: 'bg-amber-500/10 text-amber-600 border-amber-500/10 border font-bold',
  CRITICAL: 'bg-rose-500 text-white border-transparent font-extrabold shadow-sm'
};

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border border-slate-200/50',
  SCHEDULED: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-600 border border-emerald-550/20 font-bold',
  EXPIRED: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
  ARCHIVED: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-slate-305/30'
};

export default function AnnouncementHistory() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    status: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAnnouncements();
  }, [filters, page]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        ...filters
      }).toString();

      const response = await adminGet(`/admin/announcements?${params}`);
      
      if (response?.data?.announcements) {
        setAnnouncements(response.data.announcements);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      setError('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await adminDelete(`/admin/announcements/${announcementId}`);
      setAnnouncements(announcements.filter(a => a.announcement_id !== announcementId));
    } catch (error) {
      setError('Failed to delete announcement');
    }
  };

  const handleArchive = async (announcementId) => {
    try {
      await adminPatch(`/admin/announcements/${announcementId}/archive`);
      fetchAnnouncements();
    } catch (error) {
      setError('Failed to archive announcement');
    }
  };

  const handleViewStats = async (announcementId) => {
    navigate(`/admin/announcements/${announcementId}/stats`);
  };

  const handleViewDetails = (announcementId) => {
    navigate(`/admin/announcements/${announcementId}`);
  };

  const handleDuplicate = async (announcement) => {
    navigate('/admin/announcements/create', { state: { duplicate: announcement } });
  };

  // Helper to compute local UI counts for the statistics row
  const getStatsSummary = () => {
    return {
      total: announcements.length,
      published: announcements.filter(a => a.status === 'PUBLISHED').length,
      scheduled: announcements.filter(a => a.status === 'SCHEDULED').length,
      critical: announcements.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length
    };
  };

  const stats = getStatsSummary();

  return (
    <motion.div
      className="w-full space-y-6 font-sans text-foreground pb-12"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Page Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm text-white shrink-0">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none">
              Announcements
            </h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1 tracking-wide">
              Broadcast circulars, notices, emergency alerts, and updates to the academy roster
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/announcements/create')}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-primary hover:bg-emerald-650 rounded-xl shadow-sm transition-all h-[38px] self-start sm:self-center animate-fade-in"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Circular
        </motion.button>
      </motion.div>

      {/* Global Message Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-2xl p-4 bg-rose-500/10 border border-rose-500/20 text-rose-605 text-xs font-bold shadow-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-0.5 rounded-full hover:bg-rose-500/20 text-rose-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Circulars listed', value: stats.total, icon: FileText, color: 'border-slate-500/20 text-slate-500 bg-slate-500/5' },
          { label: 'Published notices', value: stats.published, icon: CheckCircle2, color: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' },
          { label: 'Scheduled items', value: stats.scheduled, icon: Clock, color: 'border-amber-500/20 text-amber-500 bg-amber-500/5' },
          { label: 'High Priority items', value: stats.critical, icon: ShieldAlert, color: 'border-rose-500/20 text-rose-500 bg-rose-500/5' }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className={`bg-card border ${item.color.split(' ')[0]} rounded-2xl p-4 shadow-sm flex items-center justify-between`}>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">{item.label}</span>
                <span className="text-xl sm:text-2xl font-black text-foreground mt-0.5 block">{item.value}</span>
              </div>
              <div className={`w-9 h-9 rounded-xl ${item.color.split(' ')[2]} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${item.color.split(' ')[1]}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-tight text-foreground font-semibold"
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_DETAILS).map(cat => (
                <option key={cat} value={cat}>{CATEGORY_DETAILS[cat].label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-tight text-foreground font-semibold"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-tight text-foreground font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="EXPIRED">Expired</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Search Query</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by title or msg..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-tight text-foreground font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List Container */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 animate-fade-in">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex gap-2">
                <div className="h-4 w-28 bg-muted rounded-full" />
                <div className="h-4 w-16 bg-muted rounded-full" />
                <div className="h-4 w-20 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-1/3 bg-muted rounded-lg" />
              <div className="h-4 w-2/3 bg-muted rounded-lg" />
              <div className="h-4 w-1/4 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No circulars found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              There are no announcements matching your configured filters. Try resetting the criteria or compose a new circular.
            </p>
          </div>
          <motion.button
            onClick={() => navigate('/admin/announcements/create')}
            whileHover={{ scale: 1.02 }}
            className="btn btn-secondary text-xs py-2 px-4 border border-border rounded-xl font-bold"
          >
            Create Announcement
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((announcement) => {
            const cat = CATEGORY_DETAILS[announcement.category] || { label: announcement.category, icon: HelpCircle, color: 'bg-slate-100 text-slate-800' };
            const CatIcon = cat.icon;

            return (
              <motion.div
                key={announcement.announcement_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all group relative text-left"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3 min-w-0">
                    
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${cat.color}`}>
                        <CatIcon className="w-3 h-3 shrink-0" />
                        {cat.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${PRIORITY_COLORS[announcement.priority] || ''}`}>
                        {announcement.priority} Priority
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_COLORS[announcement.status] || ''}`}>
                        {announcement.status}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div>
                      <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors tracking-tight">
                        {announcement.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1.5 leading-relaxed break-words whitespace-pre-line">
                        {announcement.message}
                      </p>
                    </div>

                    {/* Stats metrics row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/30 max-w-2xl text-[11px] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Recipients: <strong className="text-foreground">{announcement.total_recipients}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                        <span>Delivered: <strong className="text-foreground">{announcement.delivered_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Read: <strong className="text-foreground">{announcement.read_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rate: <strong className="text-primary">{announcement.total_recipients > 0 ? Math.round((announcement.read_count / announcement.total_recipients) * 100) : 0}%</strong></span>
                      </div>
                    </div>

                    {/* Meta timestamps */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                      </div>
                      {announcement.scheduled_for && (
                        <span>• Scheduled: {new Date(announcement.scheduled_for).toLocaleString()}</span>
                      )}
                      {announcement.expires_at && (
                        <span>• Expires: {new Date(announcement.expires_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons panel */}
                  <div className="flex items-center gap-1 self-end md:self-start bg-muted/30 border border-border/50 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => handleViewDetails(announcement.announcement_id)}
                      className="p-1.5 text-slate-500 hover:text-primary hover:bg-card rounded-lg transition-all"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewStats(announcement.announcement_id)}
                      className="p-1.5 text-slate-550 hover:text-primary hover:bg-card rounded-lg transition-all"
                      title="View Statistics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(announcement)}
                      className="p-1.5 text-slate-500 hover:text-primary hover:bg-card rounded-lg transition-all"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {announcement.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchive(announcement.announcement_id)}
                        className="p-1.5 text-slate-500 hover:text-primary hover:bg-card rounded-lg transition-all"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(announcement.announcement_id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-500/5 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination Bottom Bar */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-4 border-t border-border/50 text-xs">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors font-bold text-foreground"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                  page === pageNum
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-border hover:bg-muted text-foreground'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors font-bold text-foreground"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
