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

// Enhanced Status color mapping with lively colors and glow effects
const STATUS_COLORS = {
  NEW: 'badge bg-blue/15 text-blue border border-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  CONTACTED: 'badge bg-amber/15 text-amber border border-amber/30',
  TRIAL_SCHEDULED: 'badge bg-purple/15 text-purple border border-purple/30 shadow-[0_0_10px_rgba(167,139,250,0.2)]',
  TRIAL_COMPLETED: 'badge bg-cyan/15 text-cyan border border-cyan/30',
  CONVERTED: 'badge bg-success/15 text-success border border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  CLOSED: 'badge bg-surface-secondary text-muted-foreground border border-border',
  NOT_INTERESTED: 'badge bg-danger/15 text-danger border border-danger/30',
};

// Helper for Pulse Dot based on status urgency
const getStatusDot = (status) => {
  if (['NEW', 'TRIAL_SCHEDULED'].includes(status)) {
    return <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current shadow-[0_0_5px_currentColor]"></span>;
  }
  return null;
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

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  const setFieldError = (field, message) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const setBackendFieldErrors = (backendErrors) => {
    setFieldErrors(backendErrors);
  };

  const validateField = (field, value) => {
    let error = '';

    switch (field) {
      case 'student_name':
        if (!value || value.trim() === '') {
          error = 'Student name is required';
        }
        break;
      case 'phone':
        if (!value || value.trim() === '') {
          error = 'Phone number is required';
        } else if (!/^[0-9]{10}$/.test(value.replace(/[\s-]/g, ''))) {
          error = 'Phone number must be 10 digits';
        }
        break;
      case 'email':
        if (value && value.trim() !== '' && !/^[\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Enter a valid email address';
        }
        break;
      case 'interested_sports':
        if (!value || value.length === 0) {
          error = 'At least one sport must be selected';
        }
        break;
      default:
        break;
    }

    if (error) {
      setFieldError(field, error);
      return false;
    }
    clearFieldError(field);
    return true;
  };

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
    setFieldErrors({});

    const isValid =
      validateField('student_name', formData.student_name) &&
      validateField('phone', formData.phone) &&
      validateField('email', formData.email) &&
      validateField('interested_sports', formData.interested_sports);

    if (!isValid) return;

    setSubmitting(true);
    try {
      await adminPost('/admin/enquiries', formData);
      setShowAddModal(false);
      resetForm();
      setFieldErrors({});
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Enquiry added successfully', 'success');
    } catch (err) {
      if (err.data && err.data.errors) {
        setBackendFieldErrors(err.data.errors);
        showToast('Please fix the validation errors below.', 'error');
      } else {
        showToast(err.message || 'Failed to add enquiry', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEnquiry = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const isValid =
      validateField('student_name', formData.student_name) &&
      validateField('phone', formData.phone) &&
      validateField('email', formData.email) &&
      validateField('interested_sports', formData.interested_sports);

    if (!isValid) return;

    setSubmitting(true);
    try {
      await adminPut(`/admin/enquiries/${selectedEnquiry.id}`, formData);
      setShowEditModal(false);
      resetForm();
      setFieldErrors({});
      setSelectedEnquiry(null);
      fetchEnquiries();
      fetchDashboardStats();
      showToast('Enquiry updated successfully', 'success');
    } catch (err) {
      if (err.data && err.data.errors) {
        setBackendFieldErrors(err.data.errors);
        showToast('Please fix the validation errors below.', 'error');
      } else {
        showToast(err.message || 'Failed to update enquiry', 'error');
      }
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

  const handleCompleteFollowUp = async (enquiryId) => {
    try {
      await adminPost(`/admin/enquiries/${enquiryId}/follow-up/complete`);
      fetchEnquiries();
      showToast('Follow-up marked as completed', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to complete follow-up', 'error');
    }
  };

  const handleConvertToStudent = async () => {
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // ==================== RENDER ====================

  return (
    <motion.div
      className="space-y-6 p-6 w-full overflow-x-hidden bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-xl px-6 py-3.5 font-medium shadow-xl backdrop-blur-md border ${
              toast.type === 'success' 
                ? 'bg-success/20 text-success border-success/30 shadow-success/10' 
                : 'bg-danger/20 text-danger border-danger/30 shadow-danger/10'
            }`}
          >
            {toast.type === 'success' ? '✨ ' : '🚨 '}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Enquiries Desk
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Manage incoming leads, follow-ups, and student conversions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto z-10">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyFormLink} 
            className="btn-secondary flex-1 md:flex-none border-border/50 bg-surface/50 backdrop-blur-md hover:bg-surface"
          >
            🔗 Copy Link
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQRModal(true)} 
            className="btn-secondary flex-1 md:flex-none border-border/50 bg-surface/50 backdrop-blur-md hover:bg-surface"
          >
            📱 QR Code
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(var(--color-accent-primary), 0.3)" }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary flex-1 md:flex-none bg-gradient-to-r from-primary to-accent-hover border-transparent"
          >
            + Add Enquiry
          </motion.button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="card p-5 flex flex-col justify-center gap-1 border-t-4 border-t-primary/80 bg-gradient-to-br from-surface to-primary/5 hover:border-primary transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Enquiries</span>
          <span className="text-3xl font-black text-foreground drop-shadow-sm">{stats.totalEnquiries}</span>
        </motion.div>
        
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="card p-5 flex flex-col justify-center gap-1 border-t-4 border-t-blue/80 bg-gradient-to-br from-surface to-blue/5 hover:border-blue transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue animate-pulse"></span> New Enquiries
          </span>
          <span className="text-3xl font-black text-blue drop-shadow-sm">{stats.newEnquiries}</span>
        </motion.div>
        
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="card p-5 flex flex-col justify-center gap-1 border-t-4 border-t-warning/80 bg-gradient-to-br from-surface to-warning/5 hover:border-warning transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning"></span> Follow-ups Due
          </span>
          <span className="text-3xl font-black text-warning drop-shadow-sm">{stats.followUpsDueToday}</span>
        </motion.div>
        
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="card p-5 flex flex-col justify-center gap-1 border-t-4 border-t-success/80 bg-gradient-to-br from-surface to-success/5 hover:border-success transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success"></span> Converted
          </span>
          <span className="text-3xl font-black text-success drop-shadow-sm">{stats.convertedEnquiries}</span>
        </motion.div>
        
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="card p-5 flex flex-col justify-center gap-1 border-t-4 border-t-purple/80 bg-gradient-to-br from-surface to-purple/5 hover:border-purple transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Conversion Rate</span>
          <span className="text-3xl font-black text-purple drop-shadow-sm">{stats.conversionRate}%</span>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-5 border border-border/40 bg-surface/40 backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5 relative">
             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search</label>
             <input
              type="text"
              placeholder="Search name, phone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field bg-background/50 border-border/60"
            />
          </div>
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field bg-background/50 border-border/60"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sport Interested</label>
            <input
              type="text"
              placeholder="e.g. Football"
              value={filters.sportInterested}
              onChange={(e) => setFilters({ ...filters, sportInterested: e.target.value })}
              className="input-field bg-background/50 border-border/60"
            />
          </div>
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input-field bg-background/50 border-border/60"
            />
          </div>
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input-field bg-background/50 border-border/60"
            />
          </div>
        </div>
      </motion.div>

      {/* Enquiries Table */}
      <div className="card p-0 overflow-hidden border border-border/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-border/50 p-5 bg-surface-secondary/20">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="text-xl">📋</span> Enquiries Database
          </h2>
          <div className="flex gap-2 bg-surface p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${
                viewFilter === 'all'
                  ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Enquiries
            </button>
            <button
              onClick={() => setViewFilter('converted')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${
                viewFilter === 'converted'
                  ? 'bg-success/10 text-success shadow-sm border border-success/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Converted Only
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-sm font-semibold text-muted-foreground">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            Loading database records...
          </div>
        ) : error ? (
          <div className="p-6">
             <div className="alert-error border-danger/30 bg-danger/10 text-danger rounded-xl p-4">{error}</div>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-surface-secondary/10">
            <div className="h-20 w-20 mb-5 rounded-full bg-surface shadow-inner border border-border/50 flex items-center justify-center text-3xl">
              📥
            </div>
            <h3 className="text-xl font-bold text-foreground">No enquiries found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">Try adjusting your search filters or add a new enquiry to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-surface-secondary/40 backdrop-blur-md">
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th>Phone</th>
                  <th>Interested Sports</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {enquiries
                  .filter((enq) => {
                    if (viewFilter === 'converted') {
                      return enq.status === 'CONVERTED';
                    }
                    return true;
                  })
                  .map((enq) => (
                  <motion.tr
                    variants={itemVariants}
                    key={enq.id}
                    className="group transition-colors duration-200"
                  >
                    <td className="font-mono text-xs text-muted-foreground/70">{enq.id}</td>
                    <td className="font-semibold text-foreground group-hover:text-primary transition-colors">{enq.student_name}</td>
                    <td className="text-muted-foreground text-sm">{enq.parent_name || '—'}</td>
                    <td className="font-mono text-sm tracking-tight">{enq.phone}</td>
                    <td>
                      {enq.interested_sports ? (
                        (() => {
                          try {
                            const sports = JSON.parse(enq.interested_sports);
                            return sports.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {sports.map((sport, idx) => (
                                  <span key={idx} className="badge bg-surface-secondary text-foreground/80 border border-border shadow-sm text-[10px]">
                                    {sport}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>;
                          } catch (e) {
                            return <span className="text-muted-foreground">{enq.sport_interested || '—'}</span>;
                          }
                        })()
                      ) : (
                        <span className="text-muted-foreground">{enq.sport_interested || '—'}</span>
                      )}
                    </td>
                    <td>
                      <span className={STATUS_COLORS[enq.status] || 'badge'}>
                        {getStatusDot(enq.status)}
                        {enq.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-medium text-foreground/80 text-sm">
                      {enq.follow_up_date ? (
                         <div className="flex items-center gap-2">
                           <span className="flex items-center gap-1.5">
                             <span className="text-muted-foreground/60 text-xs">📅</span>
                             {formatDate(enq.follow_up_date)}
                           </span>
                           {enq.status !== 'CONVERTED' && (
                             <motion.button
                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                               onClick={() => handleCompleteFollowUp(enq.id)}
                               className="btn-sm text-[10px] font-bold bg-success/10 text-success hover:bg-success hover:text-white border border-transparent hover:border-success transition-colors px-2 py-0.5"
                               title="Mark follow-up as completed"
                             >
                               Complete
                             </motion.button>
                           )}
                         </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-start opacity-80 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(enq)}
                          className="btn-ghost btn-sm text-[11px] font-bold px-2.5 py-1"
                        >
                          Edit
                        </motion.button>
                        {enq.status !== 'CONVERTED' && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedEnquiry(enq);
                                setShowFollowUpModal(true);
                              }}
                              className="btn-sm text-[11px] font-bold bg-blue/10 text-blue hover:bg-blue hover:text-white border border-transparent hover:border-blue transition-colors px-2.5 py-1"
                            >
                              Follow-up
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedEnquiry(enq);
                                setShowConvertModal(true);
                              }}
                              className="btn-sm text-[11px] font-bold bg-success/10 text-success hover:bg-success hover:text-white border border-transparent hover:border-success transition-colors px-2.5 py-1"
                            >
                              Convert
                            </motion.button>
                          </>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setSelectedEnquiry(enq);
                            setShowDeleteModal(true);
                          }}
                          className="btn-sm text-[11px] font-bold text-muted-foreground hover:bg-danger hover:text-white transition-colors px-2.5 py-1"
                        >
                          Del
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card max-h-[90vh] w-full max-w-2xl flex flex-col p-0 overflow-hidden shadow-2xl border border-primary/20"
            >
              <div className="flex items-center justify-between border-b border-border/50 p-6 bg-gradient-to-r from-surface-secondary to-primary/5">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-primary text-2xl">+</span> Add New Enquiry
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted-foreground transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-6 custom-scrollbar bg-surface/30">
                <form id="add-form" onSubmit={handleCreateEnquiry} className="space-y-5">
                  {/* Keep exact existing form fields, just with your global classes */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="label">Student Name *</label>
                      <input
                        type="text"
                        required
                        className={`input-field ${fieldErrors.student_name ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.student_name}
                        onChange={(e) => {
                          setFormData({ ...formData, student_name: e.target.value });
                          clearFieldError('student_name');
                        }}
                        onBlur={() => validateField('student_name', formData.student_name)}
                      />
                      {fieldErrors.student_name && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.student_name}</p>}
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
                        className={`input-field ${fieldErrors.phone ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          clearFieldError('phone');
                        }}
                        onBlur={() => validateField('phone', formData.phone)}
                      />
                      {fieldErrors.phone && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        className={`input-field ${fieldErrors.email ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          clearFieldError('email');
                        }}
                        onBlur={() => validateField('email', formData.email)}
                      />
                      {fieldErrors.email && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.email}</p>}
                    </div>
                    <div>
                      <label className="label">Interested Sports *</label>
                      <select
                        multiple
                        className={`input-field min-h-[120px] custom-scrollbar ${fieldErrors.interested_sports ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.interested_sports}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                          setFormData({ ...formData, interested_sports: selectedOptions, sport_interested: selectedOptions[0] || '' });
                          clearFieldError('interested_sports');
                        }}
                        onBlur={() => validateField('interested_sports', formData.interested_sports)}
                        required
                      >
                        {SPORTS_OPTIONS.map((sport) => (
                          <option key={sport} value={sport} className="py-1">
                            {sport}
                          </option>
                        ))}
                      </select>
                      <p className="text-muted-foreground mt-1.5 text-[10px] uppercase font-bold tracking-wider">
                        Hold Ctrl/Cmd to select multiple
                      </p>
                      {fieldErrors.interested_sports && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.interested_sports}</p>}
                    </div>
                    
                    <div className="space-y-5">
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
                      className="input-field min-h-[100px]"
                      placeholder="Add any additional context or remarks..."
                    />
                  </div>
                </form>
              </div>
              <div className="flex justify-end gap-3 border-t border-border/50 bg-surface-secondary p-6">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" form="add-form" disabled={submitting} className="btn-primary shadow-[0_0_15px_rgba(var(--color-accent-primary),0.3)]">
                    {submitting ? 'Adding...' : 'Save Enquiry'}
                  </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card max-h-[90vh] w-full max-w-2xl flex flex-col p-0 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 p-6 bg-gradient-to-r from-surface-secondary to-blue/5">
                <h3 className="text-xl font-bold text-foreground">Edit Enquiry</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted-foreground transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-6 custom-scrollbar bg-surface/30">
                <form id="edit-form" onSubmit={handleUpdateEnquiry} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="label">Student Name *</label>
                      <input
                        type="text"
                        required
                        className={`input-field ${fieldErrors.student_name ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.student_name}
                        onChange={(e) => {
                          setFormData({ ...formData, student_name: e.target.value });
                          clearFieldError('student_name');
                        }}
                        onBlur={() => validateField('student_name', formData.student_name)}
                      />
                      {fieldErrors.student_name && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.student_name}</p>}
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
                        className={`input-field ${fieldErrors.phone ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          clearFieldError('phone');
                        }}
                        onBlur={() => validateField('phone', formData.phone)}
                      />
                      {fieldErrors.phone && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        className={`input-field ${fieldErrors.email ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          clearFieldError('email');
                        }}
                        onBlur={() => validateField('email', formData.email)}
                      />
                      {fieldErrors.email && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.email}</p>}
                    </div>
                    <div>
                      <label className="label">Interested Sports *</label>
                      <select
                        multiple
                        className={`input-field min-h-[120px] custom-scrollbar ${fieldErrors.interested_sports ? 'border-danger focus:ring-danger/20' : ''}`}
                        value={formData.interested_sports}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                          setFormData({ ...formData, interested_sports: selectedOptions, sport_interested: selectedOptions[0] || '' });
                          clearFieldError('interested_sports');
                        }}
                        onBlur={() => validateField('interested_sports', formData.interested_sports)}
                        required
                      >
                        {SPORTS_OPTIONS.map((sport) => (
                          <option key={sport} value={sport} className="py-1">
                            {sport}
                          </option>
                        ))}
                      </select>
                      <p className="text-muted-foreground mt-1.5 text-[10px] uppercase font-bold tracking-wider">
                        Hold Ctrl/Cmd to select multiple
                      </p>
                      {fieldErrors.interested_sports && <p className="mt-1.5 text-[11px] font-semibold text-danger">{fieldErrors.interested_sports}</p>}
                    </div>
                    
                    <div className="space-y-5">
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
                        className="input-field font-semibold"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Follow-up Date</label>
                      <input
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                        className="input-field w-full md:w-1/2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input-field min-h-[100px]"
                    />
                  </div>
                </form>
              </div>
              <div className="flex justify-end gap-3 border-t border-border/50 bg-surface-secondary p-6">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" form="edit-form" disabled={submitting} className="btn-primary">
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card w-full max-w-md p-6 shadow-2xl border-t-4 border-t-blue/80"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-foreground">Schedule Follow-up</h3>
                <button onClick={() => setShowFollowUpModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="bg-surface rounded-xl p-4 mb-5 border border-border/50 shadow-sm">
                <p className="text-sm mb-2 flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-muted-foreground font-semibold">Student</span>
                  <span className="font-bold">{selectedEnquiry.student_name}</span>
                </p>
                <p className="text-sm flex justify-between items-center pt-1">
                  <span className="text-muted-foreground font-semibold">Current Status</span>
                  <span className={STATUS_COLORS[selectedEnquiry.status] || 'badge'}>{selectedEnquiry.status.replace('_', ' ')}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="label text-blue">Next Follow-up Date *</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-field border-blue/20 focus:border-blue focus:ring-blue/10 bg-blue/5"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowFollowUpModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleScheduleFollowUp} disabled={submitting} className="btn-primary bg-blue hover:bg-blue-hover shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  {submitting ? 'Scheduling...' : 'Confirm Date'}
                </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card w-full max-w-md p-6 shadow-2xl border-t-4 border-t-success/80 relative overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-success/10 rounded-full blur-2xl"></div>

              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-success/20 p-2.5 rounded-xl text-success shadow-inner">🎓</div>
                  <h3 className="text-xl font-bold text-foreground">Convert to Student</h3>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="bg-surface space-y-3 rounded-xl p-5 mb-5 border border-border/50 text-sm relative z-10 shadow-sm">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-muted-foreground font-semibold">Student Name</span>
                  <span className="font-bold text-[15px]">{selectedEnquiry.student_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-muted-foreground font-semibold">Parent</span>
                  <span className="font-medium">{selectedEnquiry.parent_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-muted-foreground font-semibold">Phone</span>
                  <span className="font-mono bg-surface-secondary px-2 py-0.5 rounded">{selectedEnquiry.phone}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 pt-1">
                  <span className="text-muted-foreground font-semibold w-full text-left">Interested Sports</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedEnquiry.interested_sports ? (
                      (() => {
                        try {
                          const sports = JSON.parse(selectedEnquiry.interested_sports);
                          return sports.length > 0 ? sports.map(s => <span key={s} className="badge bg-background shadow-sm border-border border">{s}</span>) : <span>{selectedEnquiry.sport_interested || '—'}</span>;
                        } catch (e) {
                          return <span>{selectedEnquiry.sport_interested || '—'}</span>;
                        }
                      })()
                    ) : (
                      <span>{selectedEnquiry.sport_interested || '—'}</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed mb-6 p-3.5 bg-success/5 border border-success/20 rounded-lg text-success/90 relative z-10">
                This action will provision a new active student record in the system and automatically update the enquiry lifecycle status to <strong>CONVERTED</strong>. The original historic timeline will be safely preserved.
              </p>

              <div className="flex justify-end gap-3 relative z-10">
                <button onClick={() => setShowConvertModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleConvertToStudent} disabled={submitting} className="btn-success shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full sm:w-auto">
                  {submitting ? 'Processing...' : 'Confirm Conversion'}
                </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card w-full max-w-md p-6 shadow-2xl border-t-4 border-t-danger/80 relative overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-danger/10 rounded-full blur-2xl"></div>

              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-danger/20 p-2.5 rounded-xl text-danger shadow-inner">⚠️</div>
                  <h3 className="text-xl font-bold text-foreground">Delete Record</h3>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed relative z-10 p-4 bg-surface rounded-xl border border-border/50">
                You are about to permanently delete the enquiry record for <strong className="text-foreground text-[15px] block mt-1">{selectedEnquiry.student_name}</strong>
                <br/>This action is irreversible and removes all associated historic logs. Proceed?
              </p>

              <div className="flex justify-end gap-3 relative z-10">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Keep Record</button>
                <button onClick={handleDeleteEnquiry} disabled={submitting} className="btn-danger shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="card w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center bg-gradient-to-b from-surface to-surface-secondary border border-border/50"
            >
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute right-5 top-5 text-muted-foreground hover:text-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border/50 hover:bg-surface-secondary"
              >
                ✕
              </button>
              
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-black text-foreground mb-1">Public Intake Form</h3>
              <p className="text-sm text-muted-foreground mb-6">Scan to submit a new remote enquiry</p>

              <div ref={qrCodeRef} className="rounded-2xl bg-white p-5 shadow-lg border-4 border-surface ring-1 ring-border/50">
                {typeof window !== 'undefined' && (
                  <QRCodeSVG
                    value={`${window.location.origin}/enquiry-form`}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#0a0f0d" 
                  />
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadQR}
                className="btn-primary mt-8 w-full shadow-[0_0_15px_rgba(var(--color-accent-primary),0.3)]"
              >
                Download PNG Graphic
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}