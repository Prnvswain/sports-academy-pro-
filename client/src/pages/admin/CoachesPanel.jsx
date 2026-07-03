import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Lock, Unlock, Key, Trash2, Edit, Plus, Upload, Search, X, Mail, Phone, FileSpreadsheet, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/client';

const emptyForm = {
  name: '',
  email: '',
  phone_number: '',
  specialization: '',
};

export default function CoachesPanel() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportUploading, setBulkImportUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      case 'name':
        if (!value || value.trim() === '') {
          error = 'Coach name is required';
        }
        break;
      case 'email':
        if (!value || value.trim() === '') {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Enter a valid email address';
        }
        break;
      case 'phone_number':
        if (!value || value.trim() === '') {
          error = 'Phone number is required';
        } else if (!/^[0-9]{10}$/.test(value.replace(/[\s-]/g, ''))) {
          error = 'Phone number must be 10 digits';
        }
        break;
      case 'specialization':
        if (!value || value.trim() === '') {
          error = 'Specialization is required';
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

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGet('/admin/coaches');
      setCoaches(result.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    // Validate all fields
    const isValid =
      validateField('name', form.name) &&
      validateField('email', form.email) &&
      validateField('phone_number', form.phone_number) &&
      validateField('specialization', form.specialization);

    if (!isValid) {
      setSubmitting(false);
      return;
    }

    try {
      const result = await adminPost('/admin/coaches', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        specialization: form.specialization.trim(),
      });
      setMessage({
        text: `${result.message} Login credentials have been emailed to the coach.`,
        type: 'success',
      });
      setForm(emptyForm);
      setFieldErrors({});
      setShowModal(false);
      loadCoaches();
    } catch (error) {
      // Handle structured validation errors from backend
      if (error.data && error.data.errors) {
        setBackendFieldErrors(error.data.errors);
        setMessage({ text: 'Please fix the validation errors below.', type: 'error' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (coachId) => {
    if (!window.confirm('Archive this coach? Record will be soft-deleted (is_deleted: true).')) {
      return;
    }
    try {
      await adminDelete(`/admin/coaches/${coachId}`);
      setMessage({ text: 'Coach archived successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleMarkActive = async (coachId) => {
    try {
      await adminPut(`/admin/coaches/${coachId}`, { status: 'ACTIVE' });
      setMessage({ text: 'Coach marked as active successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDeactivate = async (coachId) => {
    try {
      await adminPut(`/admin/coaches/${coachId}`, { status: 'INACTIVE' });
      setMessage({ text: 'Coach deactivated successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const openModal = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      setMessage({ text: 'Please select a CSV file to upload.', type: 'error' });
      return;
    }

    if (!bulkImportFile.name.endsWith('.csv')) {
      setMessage({ text: 'Please upload a valid CSV file.', type: 'error' });
      return;
    }

    setBulkImportUploading(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData();
    formData.append('file', bulkImportFile);

    try {
      const result = await adminPost('/admin/coaches/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ text: result.message || 'Coaches imported successfully!', type: 'success' });
      setShowBulkImportModal(false);
      setBulkImportFile(null);
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message || 'Failed to import coaches.', type: 'error' });
    } finally {
      setBulkImportUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = 'first_name,last_name,email,phone,specialization,status\nJohn,Doe,john.doe@example.com,1234567890,Basketball,ACTIVE\nJane,Smith,jane.smith@example.com,9876543210,Football,ACTIVE';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'coaches_sample_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text, type) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setMessage({ text: `${type} copied to clipboard!`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const filteredCoaches = (coaches || []).filter((coach) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (coach?.name || '').toLowerCase().includes(searchLower) ||
      (coach?.email || '').toLowerCase().includes(searchLower) ||
      (coach?.specialization || '').toLowerCase().includes(searchLower);

    const matchesStatus = !statusFilter || coach?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = coaches.filter(c => c.status === 'ACTIVE').length;

  // Animation Variants
  const tableContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }
  };

  return (
    <motion.div
      className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a0f0d] p-6 lg:p-10 space-y-8 font-sans overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-[1600px] space-y-8">
        
        {/* Header with Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white dark:bg-[#111814] p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 dark:ring-gray-800/60 relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Coaches Panel</h2>
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 py-1 px-3 rounded-full text-xs font-bold ring-1 ring-emerald-200 dark:ring-emerald-800">
                {activeCount} Active
              </span>
            </div>
            <p className="text-gray-500 mt-2 font-medium text-sm">Provision coaches and auto-generate access credentials.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <motion.button
              type="button"
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 dark:bg-[#111814] dark:border-gray-700 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
              onClick={() => setShowBulkImportModal(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <FileSpreadsheet size={18} className="text-indigo-500" /> Bulk Import
            </motion.button>
            <motion.button
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgb(16,185,129,0.23)] transition-all"
              onClick={openModal}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} strokeWidth={3} /> Add Coach
            </motion.button>
          </div>
        </div>

        {/* Global Alerts */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-sm ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/50 dark:text-rose-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                <span className="text-sm font-bold tracking-wide">{message.text}</span>
                <button className="ml-auto p-1 opacity-60 hover:opacity-100 transition-opacity bg-white/50 rounded-lg" onClick={() => setMessage({ text: '', type: '' })}><X size={16} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Section */}
        <div className="bg-white dark:bg-[#111814] p-3 rounded-[1.5rem] border border-gray-100 dark:border-gray-800/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-emerald-500 focus:bg-white dark:border-gray-800 dark:focus:border-emerald-500 rounded-xl outline-none text-sm transition-all dark:text-white"
              placeholder="Search by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative sm:w-56">
            <select
              className="w-full pl-4 pr-10 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:border-emerald-500 rounded-xl outline-none font-bold text-sm text-gray-700 dark:text-gray-300 transition-all cursor-pointer appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Filter: All Status</option>
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
          </div>
        </div>

        {/* Floating Cards Table */}
        {loading ? (
          <div className="p-20 flex justify-center bg-white rounded-3xl shadow-sm"><Loader /></div>
        ) : filteredCoaches.length === 0 ? (
          <div className="bg-white dark:bg-[#111814] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 py-24 flex flex-col items-center justify-center shadow-sm">
            <div className="h-16 w-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-gray-900/50">
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-bold text-xl text-gray-900 dark:text-white">No coaches found</p>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or click 'Add Coach' to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <table className="w-full text-left text-sm border-separate border-spacing-y-3">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4">
                  <th className="px-6 py-2">Coach Details</th>
                  <th className="px-6 py-2">Contact Info</th>
                  <th className="px-6 py-2">Domain</th>
                  <th className="px-6 py-2">Status</th>
                  <th className="px-6 py-2 text-right">Manage</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={tableContainerVariants}
                initial="hidden" 
                animate="show"
              >
                {filteredCoaches.map((coach) => {
                  const isInactive = coach.status === 'INACTIVE';
                  return (
                    <motion.tr
                      key={coach.coach_id}
                      variants={rowVariants}
                      className={`group bg-white dark:bg-[#111814] shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800 hover:shadow-lg hover:ring-emerald-500/30 dark:hover:ring-emerald-500/30 transition-all duration-300 ${isInactive ? 'opacity-70 grayscale-[0.2]' : ''}`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-5 rounded-l-2xl">
                        <div className="flex items-center gap-4">
                          <div className="shadow-sm rounded-full bg-white dark:bg-gray-800 p-0.5 ring-2 ring-gray-50 dark:ring-gray-700 group-hover:ring-emerald-100 transition-all">
                            <Avatar name={coach.name} size="sm" />
                          </div>
                          <span className="font-black text-base text-gray-900 dark:text-white">{coach.name}</span>
                        </div>
                      </td>

                      {/* Email (mailto) & Phone with Copy */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2 group/action">
                            <a 
                              href={`mailto:${coach.email}`} 
                              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="Send Email"
                            >
                              <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover/action:bg-emerald-50 dark:group-hover/action:bg-emerald-900/30 transition-colors">
                                <Mail size={14} className="text-gray-400 group-hover/action:text-emerald-500" />
                              </div>
                              <span className="font-semibold">{coach.email}</span>
                            </a>
                            <button onClick={() => copyToClipboard(coach.email, 'Email')} className="opacity-0 group-hover/action:opacity-100 p-1 text-gray-400 hover:text-indigo-500 transition-all" title="Copy Email">
                              <Copy size={14} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 group/action">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <Phone size={14} className="text-gray-400" />
                              </div>
                              <span className="font-medium">{coach.phone_number || '—'}</span>
                            </div>
                            {coach.phone_number && (
                              <button onClick={() => copyToClipboard(coach.phone_number, 'Phone')} className="opacity-0 group-hover/action:opacity-100 p-1 text-gray-400 hover:text-indigo-500 transition-all" title="Copy Phone">
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Specialization Badge */}
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200/50 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {coach.specialization || 'General'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-sm ${
                            coach.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800'
                              : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${coach.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          {coach.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 rounded-r-2xl text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {coach.status === 'ACTIVE' ? (
                            <motion.button
                              whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                              type="button"
                              className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors shadow-sm"
                              onClick={() => handleDeactivate(coach.coach_id)}
                              title="Revoke Access (Deactivate)"
                            >
                              <Unlock size={16} />
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                              type="button"
                              className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
                              onClick={() => handleMarkActive(coach.coach_id)}
                              title="Grant Access (Activate)"
                            >
                              <Lock size={16} />
                            </motion.button>
                          )}
                          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                            type="button"
                            className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors shadow-sm"
                            onClick={() => handleRemove(coach.coach_id)}
                            title="Delete Coach"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Add Coach Modal --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={closeModal}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-white dark:bg-[#111814] w-full max-w-lg overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/30 dark:bg-gray-900/30">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Provision New Coach</h3>
                  <p className="text-xs text-gray-500 font-bold mt-1 tracking-wide uppercase">Secure credentials will be emailed</p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>

              <form className="p-8 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2" htmlFor="coachName">Full Name <span className="text-rose-500">*</span></label>
                  <input
                    id="coachName"
                    name="name"
                    className={`w-full p-3.5 rounded-xl border bg-gray-50/50 text-sm outline-none transition-all dark:bg-gray-900/50 dark:text-white focus:bg-white ${fieldErrors.name ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                    placeholder="e.g. John Doe"
                    value={form.name}
                    onChange={(e) => { handleChange(e); clearFieldError('name'); }}
                    onBlur={() => validateField('name', form.name)}
                  />
                  {fieldErrors.name && <p className="mt-1.5 text-xs font-bold text-rose-500">{fieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2" htmlFor="coachEmail">Email Address <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      id="coachEmail"
                      name="email"
                      type="email"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-gray-50/50 text-sm outline-none transition-all dark:bg-gray-900/50 dark:text-white focus:bg-white ${fieldErrors.email ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                      placeholder="coach@academy.com"
                      value={form.email}
                      onChange={(e) => { handleChange(e); clearFieldError('email'); }}
                      onBlur={() => validateField('email', form.email)}
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1.5 text-xs font-bold text-rose-500">{fieldErrors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2" htmlFor="coachPhone">Phone <span className="text-rose-500">*</span></label>
                    <input
                      id="coachPhone"
                      name="phone_number"
                      type="tel"
                      className={`w-full p-3.5 rounded-xl border bg-gray-50/50 text-sm outline-none transition-all dark:bg-gray-900/50 dark:text-white focus:bg-white ${fieldErrors.phone_number ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                      placeholder="10-digit number"
                      value={form.phone_number}
                      onChange={(e) => { handleChange(e); clearFieldError('phone_number'); }}
                      onBlur={() => validateField('phone_number', form.phone_number)}
                    />
                    {fieldErrors.phone_number && <p className="mt-1.5 text-xs font-bold text-rose-500">{fieldErrors.phone_number}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2" htmlFor="coachSpec">Domain <span className="text-rose-500">*</span></label>
                    <input
                      id="coachSpec"
                      name="specialization"
                      className={`w-full p-3.5 rounded-xl border bg-gray-50/50 text-sm outline-none transition-all dark:bg-gray-900/50 dark:text-white focus:bg-white ${fieldErrors.specialization ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                      placeholder="e.g. Basketball"
                      value={form.specialization}
                      onChange={(e) => { handleChange(e); clearFieldError('specialization'); }}
                      onBlur={() => validateField('specialization', form.specialization)}
                    />
                    {fieldErrors.specialization && <p className="mt-1.5 text-xs font-bold text-rose-500">{fieldErrors.specialization}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                  <motion.button
                    whileHover={{ scale: submitting ? 1 : 1.02 }}
                    whileTap={{ scale: submitting ? 1 : 0.98 }}
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? <Loader /> : 'Generate Credentials & Add'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Bulk Import Modal --- */}
      <AnimatePresence>
        {showBulkImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4" onClick={() => setShowBulkImportModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-white dark:bg-[#111814] w-full max-w-md overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/30 dark:bg-gray-900/30">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Bulk Import (CSV)</h3>
                <button type="button" onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-sm text-gray-500 font-medium">
                  Upload a CSV file to bulk import coaches. Required headers:
                  <code className="block mt-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-4 py-2.5 rounded-xl text-[11px] font-mono font-bold border border-indigo-100 dark:border-indigo-800/50 text-center">
                    first_name, last_name, email, phone, specialization, status
                  </code>
                </p>
                
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-200 text-gray-700 dark:bg-transparent dark:border-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" /> Download Sample File
                </button>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2" htmlFor="csvFile">Select Dataset</label>
                  <input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    className="w-full text-sm file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700 transition-all cursor-pointer bg-white border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 rounded-2xl"
                    onChange={(e) => setBulkImportFile(e.target.files[0])}
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                  <motion.button
                    whileHover={{ scale: (bulkImportUploading || !bulkImportFile) ? 1 : 1.02 }}
                    whileTap={{ scale: (bulkImportUploading || !bulkImportFile) ? 1 : 0.98 }}
                    type="button"
                    onClick={handleBulkImport}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={bulkImportUploading || !bulkImportFile}
                  >
                    {bulkImportUploading ? <Loader /> : 'Start Migration'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}