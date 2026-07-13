import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminGet, coachGet, parentGet, adminPatch, coachPatch, parentPatch } from '../api/client';

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
  LOW: 'border-l-gray-400',
  NORMAL: 'border-l-blue-400',
  HIGH: 'border-l-orange-400',
  CRITICAL: 'border-l-red-500'
};

export default function NotificationBell({ userRole }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [userRole]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, userRole]);

  const fetchUnreadCount = async () => {
    try {
      let response;
      if (userRole === 'ACADEMY_ADMIN') {
        response = await adminGet('/admin/announcements/unread-count');
      } else if (userRole === 'COACH') {
        response = await coachGet('/coach/announcements/unread-count');
      } else if (userRole === 'PARENT') {
        response = await parentGet('/parent/announcements/unread-count');
      }

      if (response?.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let response;
      if (userRole === 'ACADEMY_ADMIN') {
        response = await adminGet('/admin/announcements/my/announcements?limit=10');
      } else if (userRole === 'COACH') {
        response = await coachGet('/coach/announcements/my/announcements?limit=10');
      } else if (userRole === 'PARENT') {
        response = await parentGet('/parent/announcements/my/announcements?limit=10');
      }

      if (response?.data?.announcements) {
        setNotifications(response.data.announcements);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (announcementId) => {
    try {
      if (userRole === 'ACADEMY_ADMIN') {
        await adminPatch(`/admin/announcements/${announcementId}/read`);
      } else if (userRole === 'COACH') {
        await coachPatch(`/coach/announcements/${announcementId}/read`);
      } else if (userRole === 'PARENT') {
        await parentPatch(`/parent/announcements/${announcementId}/read`);
      }

      setNotifications(notifications.map(n =>
        n.announcement_id === announcementId
          ? { ...n, readStatuses: [{ is_read: true }] }
          : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (userRole === 'ACADEMY_ADMIN') {
        await adminPatch('/admin/announcements/read-all');
      } else if (userRole === 'COACH') {
        await coachPatch('/coach/announcements/read-all');
      } else if (userRole === 'PARENT') {
        await parentPatch('/parent/announcements/read-all');
      }

      setNotifications(notifications.map(n => ({ ...n, readStatuses: [{ is_read: true }] })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (announcement) => {
    handleMarkAsRead(announcement.announcement_id);
    setIsOpen(false);
    
    // Navigate to announcement details
    let detailsPath;
    if (userRole === 'PARENT') {
      detailsPath = `/parent/announcements/${announcement.announcement_id}`;
    } else if (userRole === 'COACH') {
      detailsPath = `/coach/announcements/${announcement.announcement_id}`;
    } else {
      detailsPath = `/admin/announcements/${announcement.announcement_id}`;
    }
    navigate(detailsPath);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isRead = notification.readStatuses?.[0]?.is_read;
                  return (
                    <div
                      key={notification.announcement_id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${PRIORITY_COLORS[notification.priority]} ${!isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">{notification.title}</h4>
                            {!isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[notification.category]}`}>
                              {notification.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {notification.attachments && notification.attachments.length > 0 && (
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                              </svg>
                              {notification.attachments.length} attachment{notification.attachments.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(userRole === 'PARENT' ? '/parent/announcements' : '/admin/announcements');
                }}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all announcements
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
