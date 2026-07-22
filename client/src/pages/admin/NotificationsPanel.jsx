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
        return { icon: CreditCard, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'payment_failed':
        return { icon: ShieldAlert, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'coupon_applied':
        return { icon: Gift, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      default:
        return { icon: Bell, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Bell className="text-lime-400 h-6 w-6" /> Academy Notifications
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Review important alerts, invoices approval confirmations, plan usage thresholds, and support logs.</p>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
          <p className="text-slate-400 text-sm">Fetching notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
          <Bell className="mx-auto h-12 w-12 text-slate-650 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-355">No notifications yet</h3>
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
                  className={`flex gap-4 p-4 rounded-xl border transition-all ${
                    n.is_read
                      ? 'bg-slate-900/10 border-slate-900/40 opacity-75'
                      : 'bg-slate-900/60 border-slate-800/80 shadow-md shadow-slate-950/20'
                  }`}
                >
                  <div className={`p-3 rounded-lg border ${config.color} shrink-0 self-start`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-bold ${n.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-xs text-slate-500 whitespace-nowrap self-start">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{n.body}</p>
                    
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.notification_id)}
                        className="text-xs font-semibold text-lime-400 hover:text-lime-300 mt-2.5 flex items-center gap-1 transition-all"
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
    </div>
  );
}
