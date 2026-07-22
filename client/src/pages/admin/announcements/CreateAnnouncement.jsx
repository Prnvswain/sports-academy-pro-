import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminPost, adminGet } from '../../../api/client';

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
  ALL_COACHES: 'All Coaches',
  SELECTED_COACHES: 'Selected Coaches',
  ALL_PARENTS: 'All Parents',
  SELECTED_PARENTS: 'Selected Parents',
  ALL_STUDENTS: 'All Students',
  SELECTED_STUDENTS: 'Selected Students',
  BY_SPORT: 'By Sport',
  BY_BATCH: 'By Batch',
  INDIVIDUAL: 'Individual Users'
};

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    target_type: 'ALL_PARENTS',
    target_ids: [],
    sport_id: null,
    batch_id: null,
    scheduled_for: '',
    expires_at: '',
    attachments: []
  });

  const [coaches, setCoaches] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [sports, setSports] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedCoaches, setSelectedCoaches] = useState([]);
  const [selectedParents, setSelectedParents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [coachesRes, parentsRes, studentsRes, sportsRes, batchesRes] = await Promise.all([
        adminGet('/admin/coaches'),
        adminGet('/admin/students'),
        adminGet('/admin/sports'),
        adminGet('/admin/batches')
      ]);

      if (coachesRes?.data) setCoaches(coachesRes.data);
      if (parentsRes?.data) setParents(parentsRes.data);
      if (studentsRes?.data) setStudents(studentsRes.data);
      if (sportsRes?.data) setSports(sportsRes.data);
      if (batchesRes?.data) setBatches(batchesRes.data);
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
      const response = await adminPost('/admin/announcements/upload', formData, {
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

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    // Prepare target_ids based on target_type
    let targetIds = [];
    if (formData.target_type === 'SELECTED_COACHES') {
      targetIds = selectedCoaches.map(id => ({ type: 'COACH', id }));
    } else if (formData.target_type === 'SELECTED_PARENTS') {
      targetIds = selectedParents.map(id => ({ type: 'PARENT', id }));
    } else if (formData.target_type === 'SELECTED_STUDENTS') {
      targetIds = selectedStudents.map(id => ({ type: 'STUDENT', id }));
    } else if (formData.target_type === 'INDIVIDUAL') {
      targetIds = [...selectedCoaches.map(id => ({ type: 'COACH', id })),
                   ...selectedParents.map(id => ({ type: 'PARENT', id })),
                   ...selectedStudents.map(id => ({ type: 'STUDENT', id }))];
    }

    if (targetIds.length === 0 && 
        ['SELECTED_COACHES', 'SELECTED_PARENTS', 'SELECTED_STUDENTS', 'INDIVIDUAL'].includes(formData.target_type)) {
      setError('Please select at least one recipient');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        target_ids: targetIds,
        sport_id: formData.sport_id ? parseInt(formData.sport_id) : null,
        batch_id: formData.batch_id ? parseInt(formData.batch_id) : null
    };

      await adminPost('/admin/announcements', payload);
      setSuccess('Announcement created successfully!');
      
      setTimeout(() => {
        navigate('/admin/announcements');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const renderRecipientSelector = () => {
    switch (formData.target_type) {
      case 'SELECTED_COACHES':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Select Coaches</label>
            <div className="border border-gray-300 rounded-lg p-2.5 max-h-48 overflow-y-auto">
              {coaches.map(coach => (
                <label key={coach.coach_id} className="flex items-center space-x-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedCoaches.includes(coach.coach_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCoaches([...selectedCoaches, coach.coach_id]);
                      } else {
                        setSelectedCoaches(selectedCoaches.filter(id => id !== coach.coach_id));
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{coach.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'SELECTED_PARENTS':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Select Parents</label>
            <div className="border border-gray-300 rounded-lg p-2.5 max-h-48 overflow-y-auto">
              {parents.map(parent => (
                <label key={parent.parent_id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedParents.includes(parent.parent_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParents([...selectedParents, parent.parent_id]);
                      } else {
                        setSelectedParents(selectedParents.filter(id => id !== parent.parent_id));
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{parent.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'SELECTED_STUDENTS':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Select Students</label>
            <div className="border border-gray-300 rounded-lg p-2.5 max-h-48 overflow-y-auto">
              {students.map(student => (
                <label key={student.student_id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.student_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.student_id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.student_id));
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{student.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'BY_SPORT':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Select Sport</label>
            <select
              value={formData.sport_id || ''}
              onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select a sport</option>
              {sports.map(sport => (
                <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
              ))}
            </select>
          </div>
        );
      case 'BY_BATCH':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Select Batch</label>
            <select
              value={formData.batch_id || ''}
              onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select a batch</option>
              {batches.map(batch => (
                <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>
              ))}
            </select>
          </div>
        );
      case 'INDIVIDUAL':
        return (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Select Coaches</label>
              <div className="border border-gray-300 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                {coaches.map(coach => (
                  <label key={coach.coach_id} className="flex items-center space-x-2 py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedCoaches.includes(coach.coach_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCoaches([...selectedCoaches, coach.coach_id]);
                        } else {
                          setSelectedCoaches(selectedCoaches.filter(id => id !== coach.coach_id));
                        }
                      }}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{coach.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Select Parents</label>
              <div className="border border-gray-300 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                {parents.map(parent => (
                  <label key={parent.parent_id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedParents.includes(parent.parent_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParents([...selectedParents, parent.parent_id]);
                        } else {
                          setSelectedParents(selectedParents.filter(id => id !== parent.parent_id));
                        }
                      }}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{parent.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Select Students</label>
              <div className="border border-gray-300 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                {students.map(student => (
                  <label key={student.student_id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.student_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, student.student_id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.student_id));
                        }
                      }}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">{student.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
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
          <h1 className="text-3xl font-bold text-gray-900">Create Announcement</h1>
          <p className="text-gray-600 mt-1">Send announcements to coaches, parents, and students</p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter announcement title"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter your announcement message"
              required
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {PRIORITIES.map(prio => (
                  <option key={prio} value={prio}>{prio}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
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

          {/* Recipient Selector */}
          {renderRecipientSelector()}

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Max 10MB each)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {uploadingFile ? 'Uploading...' : 'Choose File'}
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Images, PDF, Word, Excel, ZIP (Max 10MB)
              </p>
            </div>

            {formData.attachments.length > 0 && (
              <div className="mt-3.5 space-y-1.5">
                {formData.attachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-medium">{att.fileName}</span>
                      <span className="text-xs text-gray-500">
                        {(att.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
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
            )}
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule For (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires At (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Send Announcement'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/announcements')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
