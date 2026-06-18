import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPost, adminPut, adminDelete } from '../../api/client';

// Status options for dropdown
const STATUS_OPTIONS = [
  'NEW', 'CONTACTED', 'TRIAL_SCHEDULED', 'TRIAL_COMPLETED', 
  'CONVERTED', 'CLOSED', 'NOT_INTERESTED'
];

// Source options for dropdown
const SOURCE_OPTIONS = [
  'WALK_IN', 'PHONE', 'WEBSITE', 'WHATSAPP', 'REFERRAL', 'SOCIAL_MEDIA'
];

// Status color mapping
const STATUS_COLORS = {
  'NEW': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'CONTACTED': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'TRIAL_SCHEDULED': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'TRIAL_COMPLETED': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'CONVERTED': 'bg-green-500/10 text-green-600 border-green-500/20',
  'CLOSED': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  'NOT_INTERESTED': 'bg-red-500/10 text-red-600 border-red-500/20'
};

export default function EnquiriesPanel() {
  // Dashboard stats
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    newEnquiries: 0,
    followUpsDueToday: 0,
    convertedEnquiries: 0,
    conversionRate: 0
  });

  // Enquiries list
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    sportInterested: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected enquiry for operations
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    student_name: '',
    parent_name: '',
    phone: '',
    email: '',
    sport_interested: '',
    age: '',
    gender: '',
    enquiry_source: '',
    notes: '',
    follow_up_date: ''
  });

  // Follow-up date
  const [followUpDate, setFollowUpDate] = useState('');

  // Loading states
  const [submitting, setSubmitting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchEnquiries();
  }, [filters]);

  // ==================== API CALLS ====================

  const fetchDashboardStats = async () => {
    try {
      const res = await adminGet('/admin/enquiries/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.sportInterested) queryParams.append('sportInterested', filters.sportInterested);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const res = await adminGet(`/admin/enquiries?${queryParams.toString()}`);
      setEnquiries(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminPost('/admin/enquiries', formData);
      setShowAddModal(false);
      resetForm();
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Enquiry added successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add enquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminPut(`/admin/enquiries/${selectedEnquiry.id}`, formData);
      setShowEditModal(false);
      resetForm();
      setSelectedEnquiry(null);
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Enquiry updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update enquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEnquiry = async () => {
    setSubmitting(true);
    try {
      await adminDelete(`/admin/enquiries/${selectedEnquiry.id}`);
      setShowDeleteModal(false);
      setSelectedEnquiry(null);
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Enquiry deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete enquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    setSubmitting(true);
    try {
      await adminPost(`/admin/enquiries/${selectedEnquiry.id}/follow-up`, { followUpDate });
      setShowFollowUpModal(false);
      setFollowUpDate('');
      setSelectedEnquiry(null);
      fetchEnquiries();
      showToast('Follow-up scheduled successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to schedule follow-up', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToStudent = async () => {
    setSubmitting(true);
    try {
      await adminPost(`/admin/enquiries/${selectedEnquiry.id}/convert`);
      setShowConvertModal(false);
      setSelectedEnquiry(null);
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Student created successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to convert to student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const resetForm = () => {
    setFormData({
      student_name: '',
      parent_name: '',
      phone: '',
      email: '',
      sport_interested: '',
      age: '',
      gender: '',
      enquiry_source: '',
      notes: '',
      follow_up_date: ''
    });
  };

  const openEditModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setFormData({
      student_name: enquiry.student_name || '',
      parent_name: enquiry.parent_name || '',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      sport_interested: enquiry.sport_interested || '',
      age: enquiry.age || '',
      gender: enquiry.gender || '',
      enquiry_source: enquiry.enquiry_source || '',
      notes: enquiry.notes || '',
      follow_up_date: enquiry.follow_up_date ? enquiry.follow_up_date.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ==================== RENDER ====================

  return (
    <motion.div 
      className="p-6 bg-surface text-foreground min-h-screen space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Enquiries Desk</h1>
          <p className="text-sm text-muted mt-1">Manage enquiries, follow-ups, and conversions</p>
        </div>
        <motion.button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-accent text-white hover:bg-accent-hover px-6 py-3 rounded-xl font-bold shadow-md shadow-accent/10"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          + Add Enquiry
        </motion.button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
          <div className="text-2xl font-black text-accent">{stats.totalEnquiries}</div>
          <div className="text-xs text-muted font-semibold">Total Enquiries</div>
        </div>
        <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
          <div className="text-2xl font-black text-blue-600">{stats.newEnquiries}</div>
          <div className="text-xs text-muted font-semibold">New Enquiries</div>
        </div>
        <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
          <div className="text-2xl font-black text-yellow-600">{stats.followUpsDueToday}</div>
          <div className="text-xs text-muted font-semibold">Follow-ups Due Today</div>
        </div>
        <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
          <div className="text-2xl font-black text-green-600">{stats.convertedEnquiries}</div>
          <div className="text-xs text-muted font-semibold">Converted</div>
        </div>
        <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
          <div className="text-2xl font-black text-purple-600">{stats.conversionRate}%</div>
          <div className="text-xs text-muted font-semibold">Conversion Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-surface-secondary border border-border p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search enquiries..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input-field py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field py-2"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Sport interested"
            value={filters.sportInterested}
            onChange={(e) => setFilters({ ...filters, sportInterested: e.target.value })}
            className="input-field py-2"
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="input-field py-2"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="input-field py-2"
          />
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="card bg-surface-secondary border border-border p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight mb-4">All Enquiries</h2>

        {loading ? (
          <div className="py-12 text-center text-muted font-bold animate-pulse">
            Loading enquiries...
          </div>
        ) : error ? (
          <div className="alert-error p-4 rounded-xl text-sm border border-danger/20">{error}</div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted font-medium">No enquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th>Phone</th>
                  <th>Sport</th>
                  <th>Status</th>
                  <th>Follow-up Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq, index) => (
                  <motion.tr
                    key={enq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-surface/40 transition-colors"
                  >
                    <td className="font-mono text-xs">{enq.id}</td>
                    <td className="font-bold">{enq.student_name}</td>
                    <td className="text-sm">{enq.parent_name || '-'}</td>
                    <td className="text-sm">{enq.phone}</td>
                    <td className="text-sm">{enq.sport_interested || '-'}</td>
                    <td>
                      <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wider border ${
                        STATUS_COLORS[enq.status] || 'bg-surface text-muted border-border'
                      }`}>
                        {enq.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-sm">{formatDate(enq.follow_up_date)}</td>
                    <td>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => openEditModal(enq)}
                          className="btn-secondary btn-sm px-3 py-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          onClick={() => { setSelectedEnquiry(enq); setShowFollowUpModal(true); }}
                          className="bg-blue-500 text-white hover:bg-blue-600 btn-sm px-3 py-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Follow-up
                        </motion.button>
                        <motion.button
                          onClick={() => { setSelectedEnquiry(enq); setShowConvertModal(true); }}
                          className="bg-green-500 text-white hover:bg-green-600 btn-sm px-3 py-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={enq.status === 'CONVERTED'}
                        >
                          Convert
                        </motion.button>
                        <motion.button
                          onClick={() => { setSelectedEnquiry(enq); setShowDeleteModal(true); }}
                          className="bg-red-500 text-white hover:bg-red-600 btn-sm px-3 py-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Delete
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Enquiry Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl card bg-surface border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Add New Enquiry</h3>
                <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-foreground font-bold text-xl">✕</button>
              </div>

              <form onSubmit={handleCreateEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Student Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Parent Name</label>
                    <input
                      type="text"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Sport Interested *</label>
                    <input
                      type="text"
                      required
                      value={formData.sport_interested}
                      onChange={(e) => setFormData({ ...formData, sport_interested: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Source</label>
                    <select
                      value={formData.enquiry_source}
                      onChange={(e) => setFormData({ ...formData, enquiry_source: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Source</option>
                      {SOURCE_OPTIONS.map(source => (
                        <option key={source} value={source}>{source.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field min-h-[100px] resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <motion.button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary px-6 py-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    className="bg-accent text-white hover:bg-accent-hover px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? 'Adding...' : 'Add Enquiry'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Enquiry Modal */}
      <AnimatePresence>
        {showEditModal && selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl card bg-surface border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Edit Enquiry</h3>
                <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-foreground font-bold text-xl">✕</button>
              </div>

              <form onSubmit={handleUpdateEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Student Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Parent Name</label>
                    <input
                      type="text"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Sport Interested *</label>
                    <input
                      type="text"
                      required
                      value={formData.sport_interested}
                      onChange={(e) => setFormData({ ...formData, sport_interested: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Source</label>
                    <select
                      value={formData.enquiry_source}
                      onChange={(e) => setFormData({ ...formData, enquiry_source: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Source</option>
                      {SOURCE_OPTIONS.map(source => (
                        <option key={source} value={source}>{source.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field min-h-[100px] resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <motion.button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary px-6 py-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    className="bg-accent text-white hover:bg-accent-hover px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? 'Updating...' : 'Update Enquiry'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow-up Modal */}
      <AnimatePresence>
        {showFollowUpModal && selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md card bg-surface border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Schedule Follow-up</h3>
                <button onClick={() => setShowFollowUpModal(false)} className="text-muted hover:text-foreground font-bold text-xl">✕</button>
              </div>

              <div className="p-4 bg-surface-secondary rounded-xl">
                <p className="text-sm"><strong>Student:</strong> {selectedEnquiry.student_name}</p>
                <p className="text-sm"><strong>Current Status:</strong> {selectedEnquiry.status.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="label">Follow-up Date *</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <motion.button
                  onClick={() => setShowFollowUpModal(false)}
                  className="btn-secondary px-6 py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleScheduleFollowUp}
                  disabled={submitting}
                  className="bg-accent text-white hover:bg-accent-hover px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Follow-up'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert to Student Modal */}
      <AnimatePresence>
        {showConvertModal && selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md card bg-surface border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Convert to Student</h3>
                <button onClick={() => setShowConvertModal(false)} className="text-muted hover:text-foreground font-bold text-xl">✕</button>
              </div>

              <div className="p-4 bg-surface-secondary rounded-xl space-y-2">
                <p className="text-sm"><strong>Student:</strong> {selectedEnquiry.student_name}</p>
                <p className="text-sm"><strong>Parent:</strong> {selectedEnquiry.parent_name || '-'}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedEnquiry.phone}</p>
                <p className="text-sm"><strong>Sport:</strong> {selectedEnquiry.sport_interested || '-'}</p>
              </div>

              <p className="text-sm text-muted">
                This will create a new student record and mark the enquiry as converted. The original enquiry will be preserved.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <motion.button
                  onClick={() => setShowConvertModal(false)}
                  className="btn-secondary px-6 py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleConvertToStudent}
                  disabled={submitting}
                  className="bg-green-500 text-white hover:bg-green-600 px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? 'Converting...' : 'Convert to Student'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md card bg-surface border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-red-600">Delete Enquiry</h3>
                <button onClick={() => setShowDeleteModal(false)} className="text-muted hover:text-foreground font-bold text-xl">✕</button>
              </div>

              <p className="text-sm">
                Are you sure you want to delete the enquiry for <strong>{selectedEnquiry.student_name}</strong>? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <motion.button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary px-6 py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleDeleteEnquiry}
                  disabled={submitting}
                  className="bg-red-500 text-white hover:bg-red-600 px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}