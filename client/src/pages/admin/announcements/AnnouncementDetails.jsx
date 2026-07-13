import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminGet, adminPatch } from '../../../api/client';

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

export default function AnnouncementDetails() {
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
      const response = await adminGet(`/admin/announcements/${id}`);
      if (response?.data) {
        setAnnouncement(response.data);
      }
    } catch (error) {
      setError('Failed to fetch announcement details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await adminPatch(`/admin/announcements/${id}/read`);
      fetchAnnouncement();
    } catch (error) {
      setError('Failed to mark as read');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Announcement not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/announcements')}
            className="text-emerald-600 hover:text-emerald-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to History
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{announcement.title}</h1>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_COLORS[announcement.category]}`}>
            {announcement.category}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[announcement.priority]}`}>
            {announcement.priority}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            {announcement.target_type}
          </span>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
          </div>
        </div>

        {/* Attachments */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
            <div className="space-y-3">
              {announcement.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">{attachment.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{announcement.total_recipients}</p>
              <p className="text-sm text-gray-500">Total Recipients</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{announcement.delivered_count}</p>
              <p className="text-sm text-gray-500">Delivered</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{announcement.read_count}</p>
              <p className="text-sm text-gray-500">Read</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {announcement.total_recipients > 0 
                  ? Math.round((announcement.read_count / announcement.total_recipients) * 100) 
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Read Rate</p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Sender Type</span>
              <span className="font-medium text-gray-900">{announcement.sender_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900">{announcement.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created At</span>
              <span className="font-medium text-gray-900">
                {new Date(announcement.created_at).toLocaleString()}
              </span>
            </div>
            {announcement.scheduled_for && (
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled For</span>
                <span className="font-medium text-gray-900">
                  {new Date(announcement.scheduled_for).toLocaleString()}
                </span>
              </div>
            )}
            {announcement.published_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Published At</span>
                <span className="font-medium text-gray-900">
                  {new Date(announcement.published_at).toLocaleString()}
                </span>
              </div>
            )}
            {announcement.expires_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Expires At</span>
                <span className="font-medium text-gray-900">
                  {new Date(announcement.expires_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => navigate(`/admin/announcements/${id}/stats`)}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            View Detailed Statistics
          </button>
          <button
            onClick={() => navigate('/admin/announcements')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
