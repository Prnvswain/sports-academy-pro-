import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function ParentSettings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordData.currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!passwordData.newPassword) {
      setError('New password is required');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword.length > 50) {
      setError('New password must be at most 50 characters');
      return;
    }
    if (!passwordData.confirmPassword) {
      setError('Confirm password is required');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans text-left">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Security Settings
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Manage your credentials and login authentication preferences
          </p>
        </div>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-black uppercase text-foreground tracking-wider">
            Update Security Password
          </h2>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
          <div className="space-y-4 max-w-xl">
            
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Current Account Password
              </label>
              <input
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input-field py-2.5 text-xs"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input-field py-2.5 text-xs"
                required
                minLength={6}
                maxLength={50}
              />
              <p className="text-[10px] text-muted-foreground font-semibold">Minimum 6 characters, maximum 50 characters.</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input-field py-2.5 text-xs"
                required
                minLength={6}
                maxLength={50}
              />
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-5 border-t border-border/60 flex">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary text-xs py-2.5 px-6 shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Password Changes'}
            </motion.button>
          </div>
          
        </form>
      </motion.div>
    </div>
  );
}