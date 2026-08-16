import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { coachPost, coachGet } from '../../../api/client';
import { Megaphone, ArrowLeft, Send, Upload, FileText, X } from 'lucide-react';

const CATEGORIES = [
  'ANNOUNCEMENT',
  'URGENT',
  'HOLIDAY',
  'TRAINING',
  'COMPETITION',
  'GENERAL'
];

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const TARGET_TYPES = {
  BY_BATCH: 'By Batch',
  BY_SPORT: 'By Sport',
  INDIVIDUAL_PARENT: 'Individual Parent'
};

export default function CoachCreateAnnouncement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    target_type: 'BY_BATCH',
    target_ids: [],
    sport_id: '',
    batch_id: '',
    scheduled_for: '',
    expires_at: '',
    attachments: []
  });

  const [batches, setBatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedParents, setSelectedParents] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [batchesRes, sportsRes] = await Promise.all([
        coachGet('/coach/batches'),
        coachGet('/coach/sports')
      ]);
      if (batchesRes?.data) {
        setBatches(batchesRes.data.batches || (Array.isArray(batchesRes.data) ? batchesRes.data : []));
      }
      if (sportsRes?.data) setSports(sportsRes.data);
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
      const response = await coachPost('/coach/announcements/upload', formData, {
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
    if (formData.target_type === 'INDIVIDUAL_PARENT') {
      targetIds = selectedParents;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        target_ids: targetIds,
        sport_id: formData.target_type === 'BY_SPORT' ? formData.sport_id : undefined,
        batch_id: formData.target_type === 'BY_BATCH' ? formData.batch_id : undefined
      };

      await coachPost('/coach/announcements', payload);
      setSuccess('Announcement created successfully!');
      
      setTimeout(() => {
        navigate('/coach/announcements');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6 text-left">
      
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Megaphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Create Announcement
            </h1>
            <p className="text-muted-foreground mt-1">
              Publish high priority updates or training schedule changes to parents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => navigate('/coach/announcements')}
            className="btn btn-secondary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Announcements
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs font-bold">
          {success}
        </div>
      )}

      {/* Form Container Card */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5 text-left">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Announcement Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-field text-xs py-2 px-3 w-full animate-none"
            placeholder="Enter announcement title..."
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Message Content</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={5}
            className="input-field text-xs p-3 bg-card w-full resize-none font-semibold"
            placeholder="Write your announcement details..."
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Priority Scope</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
            >
              {PRIORITIES.map(pri => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Target Audience</label>
          <select
            value={formData.target_type}
            onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
            className="input-field text-xs py-2 px-3 bg-card w-full"
          >
            {Object.entries(TARGET_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {formData.target_type === 'BY_BATCH' && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Select Batch</label>
            <select
              value={formData.batch_id}
              onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
              required
            >
              <option value="">Select a batch</option>
              {(Array.isArray(batches) ? batches : []).map(batch => (
                <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.target_type === 'BY_SPORT' && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Select Sport</label>
            <select
              value={formData.sport_id}
              onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
              required
            >
              <option value="">Select a sport</option>
              {sports.map(sport => (
                <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Schedule Publish (Optional)</label>
            <input
              type="datetime-local"
              value={formData.scheduled_for}
              onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Expiry Date (Optional)</label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="input-field text-xs py-2 px-3 bg-card w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Attachments (Max 10MB)</label>
          <div className="relative border border-dashed border-border hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl p-4 text-center cursor-pointer">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              disabled={uploadingFile}
            />
            <span className="text-[11px] text-muted-foreground block font-bold">
              {uploadingFile ? 'Uploading file attachment...' : '📂 Choose file to attach'}
            </span>
          </div>
        </div>

        {formData.attachments.length > 0 && (
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider">Uploaded Attachments</label>
            {formData.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 border border-border px-3 py-2 rounded-xl text-xs font-bold text-foreground">
                <span className="truncate">{attachment.fileName || attachment.url}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-rose-500 hover:text-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={() => navigate('/coach/announcements')}
            className="btn btn-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary text-xs py-2 px-6"
          >
            {loading ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
}
