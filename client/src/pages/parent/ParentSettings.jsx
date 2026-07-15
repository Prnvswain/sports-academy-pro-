import { useState } from 'react';

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
      setError('Current password is required'); return;
    }
    if (!passwordData.newPassword) {
      setError('New password is required'); return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters'); return;
    }
    if (passwordData.newPassword.length > 50) {
      setError('New password must be at most 50 characters'); return;
    }
    if (!passwordData.confirmPassword) {
      setError('Confirm password is required'); return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match'); return;
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
        setSuccess('Password changed successfully!');
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
    /* w-full, h-full, aur absolute 0 margins diye hain taaki koi white line na bache */
    <div className="w-full h-full min-h-screen flex-1 bg-gradient-to-br from-[#effbe3] via-[#f8fafc] to-[#d8f4bc] p-6 md:p-8 -m-4 sm:m-0">
      
      {/* Header */}
      <div className="mb-6 border-b border-slate-300/50 pb-4 w-full">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
          Security Settings
        </h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Manage your academy account security, passwords, and authentication preferences.
        </p>
      </div>

      <div className="w-full">
        
        {/* Alerts */}
        {success && (
          <div className="mb-4 bg-[#f4faeb] border-l-4 border-[#90e028] text-slate-800 px-4 py-2.5 rounded-sm text-sm font-bold shadow-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-2.5 rounded-sm text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        {/* Solid White Box */}
        <div className="w-full bg-white rounded-sm shadow-sm border border-slate-200">
          
          {/* Box Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Update Password
            </h2>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="p-6 md:p-8">
            <div className="space-y-6 max-w-4xl">
              
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-sm focus:ring-0 focus:border-[#90e028] focus:shadow-[0_0_8px_rgba(144,224,40,0.2)] outline-none transition-all bg-slate-50 focus:bg-white placeholder-slate-400"
                  required
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-sm focus:ring-0 focus:border-[#90e028] focus:shadow-[0_0_8px_rgba(144,224,40,0.2)] outline-none transition-all bg-slate-50 focus:bg-white placeholder-slate-400"
                  required
                  minLength={6}
                  maxLength={50}
                />
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Minimum 6 characters, maximum 50 characters.</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter your new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-sm focus:ring-0 focus:border-[#90e028] focus:shadow-[0_0_8px_rgba(144,224,40,0.2)] outline-none transition-all bg-slate-50 focus:bg-white placeholder-slate-400"
                  required
                  minLength={6}
                  maxLength={50}
                />
              </div>

            </div>

            {/* Action Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#90e028] text-[#1a202c] rounded-sm text-sm font-black uppercase tracking-wider hover:bg-[#7bc21f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(144,224,40,0.3)] flex items-center gap-2"
              >
                {loading ? 'Updating...' : 'Save Password'}
                {!loading && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
            
          </form>
        </div>

      </div>
    </div>
  );
}