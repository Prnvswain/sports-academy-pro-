import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPost, adminPut, adminDelete } from '../../api/client';
import { QRCodeSVG } from 'qrcode.react';

// Status options for dropdown
const STATUS_OPTIONS = [
  'NEW',
  'CONTACTED',
  'TRIAL_SCHEDULED',
  'TRIAL_COMPLETED',
  'CONVERTED',
  'CLOSED',
  'NOT_INTERESTED',
];

// Source options for dropdown
const SOURCE_OPTIONS = ['WALK_IN', 'PHONE', 'WEBSITE', 'WHATSAPP', 'REFERRAL', 'SOCIAL_MEDIA'];

// Sports options for multi-select
const SPORTS_OPTIONS = [
  'Cricket',
  'Football',
  'Basketball',
  'Tennis',
  'Badminton',
  'Swimming',
  'Athletics',
  'Hockey',
  'Volleyball',
  'Table Tennis',
  'Kabaddi',
  'Other',
];

// Status color mapping
const STATUS_COLORS = {
  NEW: 'badge-info',
  CONTACTED: 'badge-warning',
  TRIAL_SCHEDULED: 'badge-purple',
  TRIAL_COMPLETED: 'badge-cyan',
  CONVERTED: 'badge-success',
  CLOSED: 'badge-muted bg-surface-secondary text-muted border-border',
  NOT_INTERESTED: 'badge-danger',
};

export default function EnquiriesPanel() {
  // Dashboard stats
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    newEnquiries: 0,
    followUpsDueToday: 0,
    convertedEnquiries: 0,
    conversionRate: 0,
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
    endDate: '',
  });

  // View filter for All vs Converted Only
  const [viewFilter, setViewFilter] = useState('all'); // 'all' or 'converted'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // QR code ref for download
  const qrCodeRef = useRef(null);

  // Selected enquiry for operations
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    student_name: '',
    parent_name: '',
    phone: '',
    email: '',
    sport_interested: '',
    interested_sports: [],
    age: '',
    gender: '',
    enquiry_source: '',
    notes: '',
    follow_up_date: '',
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
    // Prevent follow-up for already converted enquiries
    if (selectedEnquiry?.status === 'CONVERTED') {
      showToast('Cannot schedule follow-up for converted enquiries', 'error');
      return;
    }
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
    // Prevent conversion for already converted enquiries
    if (selectedEnquiry?.status === 'CONVERTED') {
      showToast('Enquiry is already converted', 'error');
      return;
    }
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
      interested_sports: [],
      age: '',
      gender: '',
      enquiry_source: '',
      notes: '',
      follow_up_date: '',
    });
  };

  const openEditModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    // Parse interested_sports from JSON if available
    let interestedSports = [];
    if (enquiry.interested_sports) {
      try {
        interestedSports = JSON.parse(enquiry.interested_sports);
      } catch (e) {
        interestedSports = [];
      }
    }
    setFormData({
      student_name: enquiry.student_name || '',
      parent_name: enquiry.parent_name || '',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      sport_interested: enquiry.sport_interested || '',
      interested_sports: interestedSports,
      age: enquiry.age || '',
      gender: enquiry.gender || '',
      enquiry_source: enquiry.enquiry_source || '',
      notes: enquiry.notes || '',
      follow_up_date: enquiry.follow_up_date ? enquiry.follow_up_date.split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyFormLink = () => {
    const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/enquiry-form`;
    navigator.clipboard
      .writeText(formUrl)
      .then(() => {
        showToast('Form link copied to clipboard!', 'success');
      })
      .catch(() => {
        showToast('Failed to copy link', 'error');
      });
  };

  const handleDownloadQR = () => {
    const canvas = qrCodeRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'enquiry-form-qr.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ==================== RENDER ====================

  return (
    <motion.div
      className="bg-surface text-foreground min-h-screen space-y-6 p-6 w-full overflow-x-hidden"
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
            className={`fixed right-4 top-4 z-50 rounded-xl px-6 py-3 shadow-lg ${
              toast.type === 'success' ? 'bg-success text-foreground' : 'bg-danger text-foreground'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-border flex flex-col items-start justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-black tracking-tight">Enquiries Desk</h1>
          <p className="text-muted mt-1 text-sm">Manage enquiries, follow-ups, and conversions</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <motion.button
            onClick={handleCopyFormLink}
            className="border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl border px-4 py-3 font-bold transition-colors flex-1 md:flex-none text-sm md:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Copy Form Link
          </motion.button>
          <motion.button
            onClick={() => setShowQRModal(true)}
            className="border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl border px-4 py-3 font-bold transition-colors flex-1 md:flex-none text-sm md:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Show QR Code
          </motion.button>
          <motion.button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-accent hover:bg-accent-hover text-foreground shadow-accent/10 rounded-xl px-6 py-3 font-bold shadow-md flex-1 md:flex-none text-sm md:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            + Add Enquiry
          </motion.button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
          <div className="text-accent text-2xl font-black">{stats.totalEnquiries}</div>
          <div className="text-muted text-xs font-semibold">Total Enquiries</div>
        </div>
        <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
          <div className="text-blue text-2xl font-black">{stats.newEnquiries}</div>
          <div className="text-muted text-xs font-semibold">New Enquiries</div>
        </div>
        <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
          <div className="text-warning text-2xl font-black">{stats.followUpsDueToday}</div>
          <div className="text-muted text-xs font-semibold">Follow-ups Due Today</div>
        </div>
        <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
          <div className="text-success text-2xl font-black">{stats.convertedEnquiries}</div>
          <div className="text-muted text-xs font-semibold">Converted</div>
        </div>
        <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
          <div className="text-purple text-2xl font-black">{stats.conversionRate}%</div>
          <div className="text-muted text-xs font-semibold">Conversion Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-surface-secondary border-border border p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
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
      <div className="card bg-surface-secondary border-border border p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight">All Enquiries</h2>
          <div className="flex gap-2">
            <motion.button
              onClick={() => setViewFilter('all')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 ${
                viewFilter === 'all'
                  ? 'bg-accent text-foreground shadow-md'
                  : 'bg-surface text-muted hover:bg-surface-secondary'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              All Enquiries
            </motion.button>
            <motion.button
              onClick={() => setViewFilter('converted')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 ${
                viewFilter === 'converted'
                  ? 'bg-accent text-foreground shadow-md'
                  : 'bg-surface text-muted hover:bg-surface-secondary'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Converted Only
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted animate-pulse py-12 text-center font-bold">
            Loading enquiries...
          </div>
        ) : error ? (
          <div className="alert-error border-danger/20 rounded-xl border p-4 text-sm">{error}</div>
        ) : enquiries.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed py-16 text-center">
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
                  <th>Interested Sports</th>
                  <th>Status</th>
                  <th>Follow-up Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries
                  .filter((enq) => {
                    if (viewFilter === 'converted') {
                      return enq.status === 'CONVERTED';
                    }
                    return true;
                  })
                  .map((enq, index) => (
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
                    <td className="text-sm">
                      {enq.interested_sports ? (
                        (() => {
                          try {
                            const sports = JSON.parse(enq.interested_sports);
                            return sports.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sports.map((sport, idx) => (
                                  <span key={idx} className="badge-info badge text-xs">
                                    {sport}
                                  </span>
                                ))}
                              </div>
                            ) : enq.sport_interested || '-';
                          } catch (e) {
                            return enq.sport_interested || '-';
                          }
                        })()
                      ) : (
                        enq.sport_interested || '-'
                      )}
                    </td>
                    <td>
                      <span className={STATUS_COLORS[enq.status] || 'badge'}>
                        {enq.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-sm">{formatDate(enq.follow_up_date)}</td>
                    <td>
                      <div className="flex items-center gap-2 justify-start">
                        <motion.button
                          onClick={() => openEditModal(enq)}
                          className="btn-secondary btn-sm px-3 py-1 text-xs"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Edit
                        </motion.button>
                        {enq.status !== 'CONVERTED' && (
                          <>
                            <motion.button
                              onClick={() => {
                                setSelectedEnquiry(enq);
                                setShowFollowUpModal(true);
                              }}
                              className="bg-blue hover:bg-blue/80 text-foreground btn-sm px-3 py-1 text-xs"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Follow-up
                            </motion.button>
                            <motion.button
                              onClick={() => {
                                setSelectedEnquiry(enq);
                                setShowConvertModal(true);
                              }}
                              className="bg-success hover:bg-success/80 text-foreground btn-sm px-3 py-1 text-xs"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Convert
                            </motion.button>
                          </>
                        )}
                        <motion.button
                          onClick={() => {
                            setSelectedEnquiry(enq);
                            setShowDeleteModal(true);
                          }}
                          className="bg-danger hover:bg-danger/80 text-foreground btn-sm px-3 py-1 text-xs"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Add New Enquiry</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    <label className="label">Interested Sports *</label>
                    <select
                      multiple
                      value={formData.interested_sports}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                        setFormData({ ...formData, interested_sports: selectedOptions, sport_interested: selectedOptions[0] || '' });
                      }}
                      className="input-field min-h-[120px]"
                      required
                    >
                      {SPORTS_OPTIONS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted mt-1 text-xs">
                      Hold Ctrl/Cmd to select multiple sports
                    </p>
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
                      {SOURCE_OPTIONS.map((source) => (
                        <option key={source} value={source}>
                          {source.replace('_', ' ')}
                        </option>
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
                    className="bg-accent hover:bg-accent-hover text-foreground rounded-xl px-6 py-2 font-bold disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Edit Enquiry</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    <label className="label">Interested Sports *</label>
                    <select
                      multiple
                      value={formData.interested_sports}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                        setFormData({ ...formData, interested_sports: selectedOptions, sport_interested: selectedOptions[0] || '' });
                      }}
                      className="input-field min-h-[120px]"
                      required
                    >
                      {SPORTS_OPTIONS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted mt-1 text-xs">
                      Hold Ctrl/Cmd to select multiple sports
                    </p>
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
                      {SOURCE_OPTIONS.map((source) => (
                        <option key={source} value={source}>
                          {source.replace('_', ' ')}
                        </option>
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
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
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
                    className="bg-accent hover:bg-accent-hover text-foreground rounded-xl px-6 py-2 font-bold disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border w-full max-w-md space-y-4 border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Schedule Follow-up</h3>
                <button
                  onClick={() => setShowFollowUpModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-surface-secondary rounded-xl p-4">
                <p className="text-sm">
                  <strong>Student:</strong> {selectedEnquiry.student_name}
                </p>
                <p className="text-sm">
                  <strong>Current Status:</strong> {selectedEnquiry.status.replace('_', ' ')}
                </p>
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
                  className="bg-accent text-foreground hover:bg-accent-hover rounded-xl px-6 py-2 font-bold disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border w-full max-w-md space-y-4 border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Convert to Student</h3>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-surface-secondary space-y-2 rounded-xl p-4">
                <p className="text-sm">
                  <strong>Student:</strong> {selectedEnquiry.student_name}
                </p>
                <p className="text-sm">
                  <strong>Parent:</strong> {selectedEnquiry.parent_name || '-'}
                </p>
                <p className="text-sm">
                  <strong>Phone:</strong> {selectedEnquiry.phone}
                </p>
                <p className="text-sm">
                  <strong>Interested Sports:</strong>{' '}
                  {selectedEnquiry.interested_sports ? (
                    (() => {
                      try {
                        const sports = JSON.parse(selectedEnquiry.interested_sports);
                        return sports.length > 0 ? sports.join(', ') : selectedEnquiry.sport_interested || '-';
                      } catch (e) {
                        return selectedEnquiry.sport_interested || '-';
                      }
                    })()
                  ) : (
                    selectedEnquiry.sport_interested || '-'
                  )}
                </p>
              </div>

              <p className="text-muted text-sm">
                This will create a new student record and mark the enquiry as converted. The
                original enquiry will be preserved.
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
                  className="bg-success hover:bg-success/80 text-foreground rounded-xl px-6 py-2 font-bold disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border w-full max-w-md space-y-4 border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-red-600">Delete Enquiry</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm">
                Are you sure you want to delete the enquiry for{' '}
                <strong>{selectedEnquiry.student_name}</strong>? This action cannot be undone.
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
                  className="bg-danger hover:bg-danger/80 text-foreground rounded-xl px-6 py-2 font-bold disabled:opacity-50"
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

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface border-border w-full max-w-sm space-y-4 border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Enquiry Form QR Code</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-muted hover:text-foreground text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div ref={qrCodeRef} className="rounded-xl bg-white p-4">
                  {typeof window !== 'undefined' && (
                    <QRCodeSVG
                      value={`${window.location.origin}/enquiry-form`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
                <p className="text-muted text-center text-sm">
                  Scan this QR code to access the public enquiry form
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <motion.button
                  onClick={() => setShowQRModal(false)}
                  className="btn-secondary px-6 py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
                <motion.button
                  onClick={handleDownloadQR}
                  className="bg-accent hover:bg-accent-hover text-foreground rounded-xl px-6 py-2 font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Download QR
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
