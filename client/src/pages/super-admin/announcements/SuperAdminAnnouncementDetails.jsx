import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { superAdminGet } from '../../../api/client';

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

export default function SuperAdminAnnouncementDetails() {
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
      const response = await superAdminGet(`/super-admin/announcements/${id}`);
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
            onClick={() => navigate('/super-admin/announcements')}
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
            {announcement.status}
          </span>
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Message</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Target Audience</h3>
            <p className="text-gray-600">{announcement.target_type}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Total Recipients</h3>
            <p className="text-gray-600">{announcement.total_recipients}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Delivered</h3>
            <p className="text-gray-600">{announcement.delivered_count}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Read</h3>
            <p className="text-gray-600">{announcement.read_count}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Created At</h3>
            <p className="text-gray-600">{new Date(announcement.created_at).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Published At</h3>
            <p className="text-gray-600">
              {announcement.published_at ? new Date(announcement.published_at).toLocaleString() : 'Not published'}
            </p>
          </div>
        </div>

        {/* Attachments */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Attachments</h2>
            <div className="space-y-2">
              {announcement.attachments.map((attachment) => (
                <a
                  key={attachment.attachment_id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="text-sm text-gray-700">{attachment.file_name}</span>
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-4.5-4.5M12 12.75l4.5-4.5M12 12.75v9" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/super-admin/announcements/${id}/stats`)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            View Statistics
          </button>
        </div>
      </motion.div>
    </div>
  );
}
