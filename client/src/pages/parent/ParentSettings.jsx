import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ParentSettings() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchParentProfile();
  }, []);

  const fetchParentProfile = async () => {
    try {
      const token = localStorage.getItem('parent_token');
      const userData = localStorage.getItem('parent_user');
      
      if (userData) {
        const user = JSON.parse(userData);
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch parent profile:', error);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        // Update local storage
        localStorage.setItem('parent_user', JSON.stringify(data.data.parent));
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Frontend validation
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/change-password', {
        method: 'PUT',
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
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and security settings</p>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
        </div>
        <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Name
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500 mt-1">Change your password</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
