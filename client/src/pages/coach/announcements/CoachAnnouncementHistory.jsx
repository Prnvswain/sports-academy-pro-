import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { coachGet, coachDelete, coachPatch } from '../../../api/client';
import { Megaphone, AlertCircle, Eye, BarChart2, Archive, Trash2, Calendar, FileText } from 'lucide-react';

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
  HIGH: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
};

const STATUS_COLORS = {
  DRAFT: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
  SCHEDULED: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  EXPIRED: 'bg-rose-500/10 text-rose-550 border border-rose-500/20',
  ARCHIVED: 'bg-slate-100 text-slate-500 border border-slate-200'
};

export default function CoachAnnouncementHistory() {
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

      const response = await coachGet(`/coach/announcements?${params}`);
      
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
      await coachDelete(`/coach/announcements/${announcementId}`);
      setAnnouncements(announcements.filter(a => a.announcement_id !== announcementId));
    } catch (error) {
      setError('Failed to delete announcement');
    }
  };

  const handleArchive = async (announcementId) => {
    try {
      await coachPatch(`/coach/announcements/${announcementId}/archive`);
      fetchAnnouncements();
    } catch (error) {
      setError('Failed to archive announcement');
    }
  };

  const handleViewStats = async (announcementId) => {
    navigate(`/coach/announcements/${announcementId}/stats`);
  };

  const handleViewDetails = (announcementId) => {
    navigate(`/coach/announcements/${announcementId}`);
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
            <h2 className="text-xl font-black text-foreground tracking-tight">Announcements</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              Manage and broadcast announcement alerts to parents and athletes.
            </p>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/coach/announcements/create')}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-end sm:self-auto"
        >
          Create Announcement
        </button>
      </motion.div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card"
            >
              <option value="">All Categories</option>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="URGENT">Urgent</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="TRAINING">Training</option>
              <option value="COMPETITION">Competition</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Priority Scope</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status Code</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="EXPIRED">Expired</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Search Keywords</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search announcements..."
              className="input-field text-xs py-2 px-3"
            />
          </div>
        </div>
      </div>

      {/* Announcements List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left">
        {announcements.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground font-bold text-xs bg-card">
            No announcements found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground bg-slate-50/50 dark:bg-slate-900/10">
                  <th className="p-4">Announcement details</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-center">Analytics</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-bold">
                {announcements.map((announcement) => (
                  <tr key={announcement.announcement_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 max-w-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground text-xs">{announcement.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${CATEGORY_COLORS[announcement.category]}`}>
                            {announcement.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-semibold truncate max-w-xs">{announcement.message}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${PRIORITY_COLORS[announcement.priority]}`}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${STATUS_COLORS[announcement.status]}`}>
                        {announcement.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground font-bold">{new Date(announcement.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <div className="inline-flex gap-3 text-[10px] text-muted-foreground font-black">
                        <span>Recipients: {announcement.total_recipients}</span>
                        <span>•</span>
                        <span>Read: {announcement.read_count}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(announcement.announcement_id)}
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleViewStats(announcement.announcement_id)}
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                          title="View Stats"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(announcement.announcement_id)}
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.announcement_id)}
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-500 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-muted-foreground font-bold">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
