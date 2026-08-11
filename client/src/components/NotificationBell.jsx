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
      if (userRole === 'ACADEMY_ADMIN') {
        const [annRes, notRes] = await Promise.all([
          adminGet('/admin/announcements/unread-count'),
          adminGet('/admin/notifications/unread-count')
        ]);
        const annCount = annRes?.data?.count || 0;
        const notCount = notRes?.data?.count || 0;
        setUnreadCount(annCount + notCount);
        return;
      }

      let annRes, notRes;
      if (userRole === 'COACH') {
        [annRes, notRes] = await Promise.all([
          coachGet('/coach/announcements/unread-count'),
          coachGet('/coach/notifications/unread-count')
        ]);
      } else if (userRole === 'PARENT') {
        [annRes, notRes] = await Promise.all([
          parentGet('/parent/announcements/unread-count'),
          parentGet('/parent/notifications/unread-count')
        ]);
      }

      const annCount = annRes?.data?.count || 0;
      const notCount = notRes?.data?.count || 0;
      setUnreadCount(annCount + notCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let annRes, notRes;
      if (userRole === 'ACADEMY_ADMIN') {
        [annRes, notRes] = await Promise.all([
          adminGet('/admin/announcements/my/announcements?limit=10'),
          adminGet('/admin/notifications?limit=10')
        ]);
      } else if (userRole === 'COACH') {
        [annRes, notRes] = await Promise.all([
          coachGet('/coach/announcements/my/announcements?limit=10'),
          coachGet('/coach/notifications?limit=10')
        ]);
      } else if (userRole === 'PARENT') {
        [annRes, notRes] = await Promise.all([
          parentGet('/parent/announcements/my/announcements?limit=10'),
          parentGet('/parent/notifications?limit=10')
        ]);
      }

      const announcements = annRes?.data?.announcements || [];
      const mappedAnn = announcements.map(a => ({
        id: `ann_${a.announcement_id}`,
        type: 'ANNOUNCEMENT',
        title: a.title,
        body: a.message,
        category: a.category || 'GENERAL',
        priority: a.priority || 'NORMAL',
        created_at: a.published_at || a.created_at,
        is_read: a.readStatuses?.[0]?.is_read || false,
        original: a
      }));

      const notifications = notRes?.data || [];
      const mappedNot = notifications.map(n => ({
        id: `not_${n.notification_id}`,
        type: 'NOTIFICATION',
        title: n.title,
        body: n.body,
        category: 'GENERAL',
        priority: 'NORMAL',
        created_at: n.created_at,
        is_read: n.is_read,
        original: n
      }));

      const combined = [...mappedAnn, ...mappedNot].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setNotifications(combined.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (item) => {
    try {
      if (item.type === 'ANNOUNCEMENT') {
        const announcementId = item.original.announcement_id;
        if (userRole === 'ACADEMY_ADMIN') {
          await adminPatch(`/admin/announcements/${announcementId}/read`);
        } else if (userRole === 'COACH') {
          await coachPatch(`/coach/announcements/${announcementId}/read`);
        } else if (userRole === 'PARENT') {
          await parentPatch(`/parent/announcements/${announcementId}/read`);
        }
      } else {
        const notificationId = item.original.notification_id;
        if (userRole === 'ACADEMY_ADMIN') {
          await adminPatch(`/admin/notifications/${notificationId}/read`);
        } else if (userRole === 'COACH') {
          await coachPatch(`/coach/notifications/${notificationId}/read`);
        } else if (userRole === 'PARENT') {
          await parentPatch(`/parent/notifications/${notificationId}/read`);
        }
      }

      setNotifications(notifications.map(n =>
        n.id === item.id
          ? { ...n, is_read: true }
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
        await Promise.all([
          adminPatch('/admin/announcements/read-all'),
          adminPatch('/admin/notifications/read-all')
        ]);
      } else if (userRole === 'COACH') {
        await Promise.all([
          coachPatch('/coach/announcements/read-all'),
          coachPatch('/coach/notifications/read-all')
        ]);
      } else if (userRole === 'PARENT') {
        await Promise.all([
          parentPatch('/parent/announcements/read-all'),
          parentPatch('/parent/notifications/read-all')
        ]);
      }

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (item) => {
    handleMarkAsRead(item);
    setIsOpen(false);

    if (item.type === 'ANNOUNCEMENT') {
      const announcementId = item.original.announcement_id;
      let detailsPath;
      if (userRole === 'PARENT') {
        detailsPath = `/parent/announcements/${announcementId}`;
      } else if (userRole === 'COACH') {
        detailsPath = `/coach/announcements/${announcementId}`;
      } else {
        detailsPath = `/admin/announcements/${announcementId}`;
      }
      navigate(detailsPath);
    } else {
      if (item.original.metadata) {
        let meta = {};
        try {
          meta = typeof item.original.metadata === 'string' ? JSON.parse(item.original.metadata) : item.original.metadata;
        } catch (e) {}
        if (meta.type === 'new_enquiry') {
          navigate('/admin/enquiries');
          return;
        }
      }
      navigate('/admin/notifications');
    }
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
                  const isRead = notification.is_read;
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${PRIORITY_COLORS[notification.priority || 'NORMAL']} ${!isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">{notification.title}</h4>
                            {!isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{notification.body}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[notification.category || 'GENERAL']}`}>
                              {notification.category || 'GENERAL'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {notification.original.attachments && notification.original.attachments.length > 0 && (
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                              </svg>
                              {notification.original.attachments.length} attachment{notification.original.attachments.length > 1 ? 's' : ''}
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
