import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { superAdminPost, superAdminGet } from '../../../api/client';

const CATEGORIES = [
  'ANNOUNCEMENT',
  'URGENT',
  'HOLIDAY',
  'FEE',
  'COMPETITION',
  'TRAINING',
  'MAINTENANCE',
  'GENERAL',
  'SPORTS_EVENT',
  'EMERGENCY'
];

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const TARGET_TYPES = {
  ALL_ACADEMIES: 'All Academies',
  SELECTED_ACADEMIES: 'Selected Academies',
  SINGLE_ACADEMY: 'Single Academy'
};

export default function SuperAdminCreateAnnouncement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    target_type: 'ALL_ACADEMIES',
    target_ids: [],
    scheduled_for: '',
    expires_at: '',
    attachments: []
  });

  const [academies, setAcademies] = useState([]);
  const [selectedAcademies, setSelectedAcademies] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const academiesRes = await superAdminGet('/super-admin/academies');
      if (academiesRes?.data) setAcademies(academiesRes.data);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await superAdminPost('/super-admin/announcements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response?.data) {
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, response.data]
        }));
      }
    } catch (error) {
      setError('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    let targetIds = [];
    if (formData.target_type === 'SELECTED_ACADEMIES') {
      targetIds = selectedAcademies.map(id => ({ type: 'ACADEMY', id }));
    } else if (formData.target_type === 'SINGLE_ACADEMY') {
      targetIds = selectedAcademies.map(id => ({ type: 'ACADEMY', id }));
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        target_ids: targetIds
      };

      await superAdminPost('/super-admin/announcements', payload);
      setSuccess('Announcement created successfully!');
      
      setTimeout(() => {
        navigate('/super-admin/announcements');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <button
            onClick={() => navigate('/super-admin/announcements')}
            className="text-emerald-600 hover:text-emerald-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Announcements
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Announcement</h1>
          <p className="text-gray-600 mt-1">Send announcements to academies</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter announcement message"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {PRIORITIES.map(pri => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <select
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {Object.entries(TARGET_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {(formData.target_type === 'SELECTED_ACADEMIES' || formData.target_type === 'SINGLE_ACADEMY') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Academies</label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {academies.map(academy => (
                  <label key={academy.academy_id} className="flex items-center mb-1.5">
                    <input
                      type="checkbox"
                      checked={selectedAcademies.includes(academy.academy_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAcademies([...selectedAcademies, academy.academy_id]);
                        } else {
                          setSelectedAcademies(selectedAcademies.filter(id => id !== academy.academy_id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{academy.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule For (Optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (Optional)</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (Max 10MB)</label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={uploadingFile}
            />
            {uploadingFile && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
          </div>

          {formData.attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded Files</label>
              <div className="space-y-1.5">
                {formData.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-sm">{attachment.file_name || attachment.url}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/super-admin/announcements')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
