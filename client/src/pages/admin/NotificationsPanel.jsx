import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPatch } from '../../api/client';
import { Bell, ShieldAlert, Loader2, CheckCircle, CreditCard, Gift, Sliders } from 'lucide-react';

export default function AdminNotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await adminGet('/admin/notifications');
      if (response?.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch academy notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const response = await adminPatch(`/admin/notifications/${id}/read`);
      if (response?.success) {
        setNotifications(prev =>
          prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getSubtypeConfig = (subtype) => {
    switch (subtype) {
      case 'payment_success':
      case 'plan_upgraded':
      case 'subscription_extended':
        return { icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' };
      case 'payment_failed':
        return { icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' };
      case 'coupon_applied':
        return { icon: Gift, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30' };
      default:
        return { icon: Bell, color: 'text-blue-550 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30' };
    }
  };

  return (
    <motion.div
      className="relative z-10 mx-auto max-w-5xl space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Academy Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Review important alerts, invoices approval confirmations, plan usage thresholds, and support logs.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#84cc16]" />
          <p className="text-slate-400 text-sm">Fetching notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-250 dark:border-gray-800 border-dashed">
          <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-gray-950 dark:text-white">No notifications yet</h3>
          <p className="text-slate-500 text-sm mt-1">We'll alert you here when subscriptions or transactions require your attention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((n) => {
              const subtype = n.metadata?.subtype;
              const config = getSubtypeConfig(subtype);
              const IconComponent = config.icon;
              return (
                <motion.div
                  key={n.notification_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                    n.is_read
                      ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-150 dark:border-gray-850 opacity-75'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-xl border ${config.color} shrink-0 self-start`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-bold text-sm ${n.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap self-start">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-650 dark:text-slate-405 mt-1 leading-relaxed">{n.body}</p>
                    
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.notification_id)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-2.5 flex items-center gap-1 transition-all"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Mark as read
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
