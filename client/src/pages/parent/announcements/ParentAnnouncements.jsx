import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { parentGet, parentPatch } from '../../../api/client';

const CATEGORY_COLORS = {
  ANNOUNCEMENT: 'bg-blue-100 text-blue-800',
  URGENT: 'bg-red-100 text-red-800',
  HOLIDAY: 'bg-green-100 text-green-800',
  FEE: 'bg-yellow-100 text-yellow-800',
  COMPETITION: 'bg-purple-100 text-purple-800',
  TRAINING: 'bg-indigo-100 text-indigo-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  GENERAL: 'bg-gray-100 text-gray-800',
  SPORTS_EVENT: 'bg-pink-100 text-pink-800',
  EMERGENCY: 'bg-red-200 text-red-900'
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  CRITICAL: 'bg-red-100 text-red-600'
};

export default function ParentAnnouncements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    fetchAnnouncements();
  }, [filter]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = filter === 'unread' ? 'unread_only=true' : '';
      const response = await parentGet(`/parent/announcements?${params}`);
      
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

  const handleViewDetails = (announcementId) => {
    handleMarkAsRead(announcementId);
    navigate(`/parent/announcements/${announcementId}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-1">View announcements from your academy</p>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Mark all as read
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <p className="text-gray-500">No announcements found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const isRead = announcement.readStatuses?.[0]?.is_read;
              return (
                <motion.div
                  key={announcement.announcement_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleViewDetails(announcement.announcement_id)}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer ${!isRead ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                        {!isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[announcement.category]}`}>
                          {announcement.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[announcement.priority]}`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{announcement.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        {announcement.attachments && announcement.attachments.length > 0 && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                            </svg>
                            {announcement.attachments.length} attachment{announcement.attachments.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
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
