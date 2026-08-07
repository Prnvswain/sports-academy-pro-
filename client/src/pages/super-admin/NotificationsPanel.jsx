import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { superAdminGet, superAdminPatch } from '../../api/client';
import { Bell, CheckCheck, Loader2, Building, CreditCard, Clock, CheckCircle } from 'lucide-react';

export default function SuperAdminNotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await superAdminGet('/super-admin/notifications');
      if (response?.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const response = await superAdminPatch(`/super-admin/notifications/${id}/read`);
      if (response?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.filter((n) => !n.is_read).length === 0) return;
    setActionLoading(true);
    try {
      const response = await superAdminPatch('/super-admin/notifications/read-all');
      if (response?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getSubtypeConfig = (subtype) => {
    switch (subtype) {
      case 'new_academy':
        return { icon: Building, color: 'text-blue-500 bg-blue-500/10 border-blue-500/25' };
      case 'plan_purchase':
        return { icon: CreditCard, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' };
      case 'payment_pending':
        return { icon: Clock, color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' };
      default:
        return { icon: Bell, color: 'text-purple-500 bg-purple-500/10 border-purple-500/25' };
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="premium-gradient-purple text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-lg shadow-purple-500/20">
            System Feeds
          </span>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-2 flex items-center gap-2">
            <Bell className="text-purple-500 h-6 w-6 animate-swing" /> System Alerts
          </h1>
          <p className="text-muted-foreground text-xs font-semibold">Monitor system sign-ups, subscriptions, renewals, and payments.</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={actionLoading || notifications.filter(n => !n.is_read).length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-955 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-xs shadow-lg shadow-black/10 transition-all"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          <p className="text-muted-foreground text-sm font-bold animate-pulse">Loading notification history...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 super-glass rounded-2xl border border-white/10 dark:border-white/5 border-dashed">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-bounce-slow" />
          <h3 className="text-base font-extrabold text-foreground uppercase tracking-wider">All caught up!</h3>
          <p className="text-muted-foreground text-xs font-bold mt-1">There are no system notifications at this time.</p>
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
                      ? 'bg-white/5 border-white/5 opacity-60'
                      : 'super-glass border-white/10 dark:border-white/5 shadow-lg shadow-purple-500/5 hover:scale-[1.01]'
                  }`}
                >
                  <div className={`p-3 rounded-xl border ${config.color} shrink-0 self-start shadow-md`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-extrabold text-sm ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap self-start">
                        {new Date(n.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold mt-1 leading-relaxed">{n.body}</p>
                    
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.notification_id)}
                        className="text-[10px] font-bold text-purple-500 dark:text-purple-400 mt-2.5 flex items-center gap-1 transition-all hover:opacity-85"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
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
    </div>
  );
}
