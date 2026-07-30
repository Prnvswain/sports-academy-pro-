import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Lock, Unlock, Key, Trash2, Edit, Plus, Upload, Search, X, Mail, Phone, FileSpreadsheet, AlertCircle, CheckCircle, Copy, Users, Trophy } from 'lucide-react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import ModalWrapper from '../../components/ModalWrapper';
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
    
    // Prevent duplicate submissions
    if (submitting) {
      return;
    }
    
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
  const totalCount = coaches.length;
  const inactiveCount = coaches.filter(c => c.status === 'INACTIVE').length;
  const domainCount = [...new Set(coaches.map(c => c.specialization).filter(Boolean))].length;

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
      className="relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Main Content Wrapper */}
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Coaches Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Provision coaches and auto-generate credentials.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowBulkImportModal(true)}
              className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md hover:bg-black dark:hover:bg-slate-100"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Bulk Import
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={openModal}
              className="bg-[#FFD100] hover:bg-[#E6BC00] text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(255,209,0,0.25)] flex items-center justify-center gap-1.5 text-xs transition-all border border-[#FFD100] uppercase tracking-widest"
            >
              <Plus size={14} strokeWidth={3} />
              Add Coach
            </motion.button>
          </div>
        </motion.div>

        {/* Global Alerts */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className={`flex items-center gap-3 p-4 rounded-xl shadow-sm border ${
                message.type === 'success'
                  ? 'bg-[#f5fbf1] border-[#98F53D] text-[#2d520d]'
                  : 'bg-[#fdf2f4] border-[#f7e0e5] text-[#EF4466]'
              }`}>
                {message.type === 'success' ? <CheckCircle size={20} className="shrink-0 text-[#7ccf2c]" /> : <AlertCircle size={20} className="shrink-0" />}
                <span className="text-sm font-bold tracking-wide">{message.text}</span>
                <button className="ml-auto p-1 opacity-60 hover:opacity-100 transition-opacity bg-white/50 rounded-lg" onClick={() => setMessage({ text: '', type: '' })}><X size={16} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Coaches</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{activeCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inactive</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{inactiveCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-450 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Domains</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{domainCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter Section (Controls Bar) */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD100]" size={16} />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-[#FFD100] rounded-xl outline-none text-sm transition-all text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium focus:ring-2 focus:ring-[#FFD100]/25"
              placeholder="Search by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative sm:w-56">
            <select
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/25 focus:border-[#FFD100] cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Filter: All Status</option>
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="p-20 flex justify-center bg-white dark:bg-gray-900 rounded-3xl shadow-sm"><Loader /></div>
        ) : filteredCoaches.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 py-24 flex flex-col items-center justify-center shadow-sm">
            <div className="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-gray-900/50">
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
                      className={`group bg-white dark:bg-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800 hover:shadow-lg hover:ring-[#FFD100]/30 dark:hover:ring-[#FFD100]/30 transition-all duration-300 ${isInactive ? 'opacity-70 grayscale-[0.2]' : ''}`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-[#FFD100]">
                        <div className="flex items-center gap-4">
                          <div className="shadow-sm rounded-full bg-white dark:bg-gray-800 p-0.5 ring-2 ring-gray-50 dark:ring-gray-750 group-hover:ring-[#FFD100] transition-all">
                            <Avatar name={coach.name} size="sm" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{coach.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Coach ID: #{coach.coach_id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email (mailto) & Phone with Copy */}
                      <td className="px-6 py-4 border-y border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-y-[#FFD100]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 group/action">
                            <a
                              href={`mailto:${coach.email}`}
                              className="flex items-center gap-2 text-gray-655 dark:text-gray-400 hover:text-[#FFD100] transition-colors"
                              title="Send Email"
                            >
                              <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover/action:bg-yellow-50 dark:group-hover/action:bg-yellow-950/20 transition-colors">
                                <Mail size={12} className="text-gray-400 group-hover/action:text-[#FFD100]" />
                              </div>
                              <span className="font-semibold text-xs">{coach.email}</span>
                            </a>
                            <button onClick={() => copyToClipboard(coach.email, 'Email')} className="opacity-0 group-hover/action:opacity-100 p-1 text-gray-400 hover:text-indigo-500 transition-all" title="Copy Email">
                              <Copy size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 group/action">
                            <div className="flex items-center gap-2 text-gray-655 dark:text-gray-400">
                              <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <Phone size={12} className="text-gray-400" />
                              </div>
                              <span className="font-medium text-xs">{coach.phone_number || '—'}</span>
                            </div>
                            {coach.phone_number && (
                              <button onClick={() => copyToClipboard(coach.phone_number, 'Phone')} className="opacity-0 group-hover/action:opacity-100 p-1 text-gray-400 hover:text-indigo-500 transition-all" title="Copy Phone">
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Specialization Badge */}
                      <td className="px-6 py-4 border-y border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-y-[#FFD100]">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-50/80 px-3 py-1.5 text-xs font-bold text-yellow-700 ring-1 ring-inset ring-yellow-250/50 dark:bg-yellow-950/20 dark:text-yellow-500 dark:ring-yellow-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD100]"></span>
                          {coach.specialization || 'General'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 border-y border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-y-[#FFD100]">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-sm ${
                            coach.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800'
                              : 'bg-gray-50 text-gray-605 ring-1 ring-gray-250 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${coach.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          {coach.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 rounded-r-2xl border-y border-r border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-[#FFD100] text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {coach.status === 'ACTIVE' ? (
                            <motion.button
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                              type="button"
                              className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/25 flex items-center justify-center transition-colors border border-yellow-100 dark:border-transparent"
                              onClick={() => handleDeactivate(coach.coach_id)}
                              title="Revoke Access (Deactivate)"
                            >
                              <Unlock size={13} />
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                              type="button"
                              className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/25 flex items-center justify-center transition-colors border border-emerald-100 dark:border-transparent"
                              onClick={() => handleMarkActive(coach.coach_id)}
                              title="Grant Access (Activate)"
                            >
                              <Lock size={13} />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            type="button"
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/25 flex items-center justify-center transition-colors border border-rose-100 dark:border-transparent"
                            onClick={() => handleRemove(coach.coach_id)}
                            title="Delete Coach"
                          >
                            <Trash2 size={13} />
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
      <ModalWrapper
        isOpen={showModal}
        onClose={closeModal}
        modalId="add-coach-modal"
        contentClassName="bg-white w-full max-w-lg overflow-hidden rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-[#EAEBF0]"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#EAEBF0] bg-[#FFFDF3]">
          <div>
            <h3 className="text-lg font-bold text-[#101625]">PROVISION NEW COACH</h3>
            <p className="text-[10px] text-[#A4ABAF] font-bold mt-1 tracking-wide uppercase">Secure credentials will be emailed</p>
          </div>
          <button type="button" onClick={closeModal} className="p-2 rounded-xl bg-white shadow-sm border border-[#EAEBF0] text-[#A4ABAF] hover:bg-[#fcc93d] hover:text-[#101625] hover:border-transparent transition-all">
            <X size={16} />
          </button>
        </div>

        <form className="p-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] font-bold text-[#A4ABAF] uppercase tracking-wider mb-2" htmlFor="coachName">Full Name <span className="text-[#EF4466]">*</span></label>
            <input
              id="coachName"
              name="name"
              className={`w-full p-4 rounded-xl border bg-white text-[13px] text-[#101625] outline-none transition-all ${fieldErrors.name ? 'border-[#EF4466] focus:ring-4 focus:ring-[#EF4466]/10' : 'border-[#EAEBF0] focus:border-[#fcc93d] focus:ring-4 focus:ring-[#FFD700]/20'}`}
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => { handleChange(e); clearFieldError('name'); }}
              onBlur={() => validateField('name', form.name)}
            />
            {fieldErrors.name && <p className="mt-1.5 text-[11px] font-bold text-[#EF4466]">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#A4ABAF] uppercase tracking-wider mb-2" htmlFor="coachEmail">Email Address <span className="text-[#EF4466]">*</span></label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A4ABAF]" size={14} />
              <input
                id="coachEmail"
                name="email"
                type="email"
                className={`w-full pl-10 pr-4 py-4 rounded-xl border bg-white text-[13px] text-[#101625] outline-none transition-all ${fieldErrors.email ? 'border-[#EF4466] focus:ring-4 focus:ring-[#EF4466]/10' : 'border-[#EAEBF0] focus:border-[#fcc93d] focus:ring-4 focus:ring-[#FFD700]/20'}`}
                placeholder="coach@academy.com"
                value={form.email}
                onChange={(e) => { handleChange(e); clearFieldError('email'); }}
                onBlur={() => validateField('email', form.email)}
              />
            </div>
            {fieldErrors.email && <p className="mt-1.5 text-[11px] font-bold text-[#EF4466]">{fieldErrors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-[#A4ABAF] uppercase tracking-wider mb-2" htmlFor="coachPhone">Phone <span className="text-[#EF4466]">*</span></label>
              <input
                id="coachPhone"
                name="phone_number"
                type="tel"
                className={`w-full p-4 rounded-xl border bg-white text-[13px] text-[#101625] outline-none transition-all ${fieldErrors.phone_number ? 'border-[#EF4466] focus:ring-4 focus:ring-[#EF4466]/10' : 'border-[#EAEBF0] focus:border-[#fcc93d] focus:ring-4 focus:ring-[#FFD700]/20'}`}
                placeholder="10-digit number"
                value={form.phone_number}
                onChange={(e) => { handleChange(e); clearFieldError('phone_number'); }}
                onBlur={() => validateField('phone_number', form.phone_number)}
              />
              {fieldErrors.phone_number && <p className="mt-1.5 text-[11px] font-bold text-[#EF4466]">{fieldErrors.phone_number}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#A4ABAF] uppercase tracking-wider mb-2" htmlFor="coachSpec">Domain <span className="text-[#EF4466]">*</span></label>
              <input
                id="coachSpec"
                name="specialization"
                className={`w-full p-4 rounded-xl border bg-white text-[13px] text-[#101625] outline-none transition-all ${fieldErrors.specialization ? 'border-[#EF4466] focus:ring-4 focus:ring-[#EF4466]/10' : 'border-[#EAEBF0] focus:border-[#fcc93d] focus:ring-4 focus:ring-[#FFD700]/20'}`}
                placeholder="e.g. Basketball"
                value={form.specialization}
                onChange={(e) => { handleChange(e); clearFieldError('specialization'); }}
                onBlur={() => validateField('specialization', form.specialization)}
              />
              {fieldErrors.specialization && <p className="mt-1.5 text-[11px] font-bold text-[#EF4466]">{fieldErrors.specialization}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAEBF0] mt-6">
            <motion.button
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              type="submit"
              className="w-full py-4 bg-[#FFD700] text-[#101625] rounded-xl font-bold text-[13px] shadow-[0_4px_12px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'GENERATE CREDENTIALS & ADD'
              )}
            </motion.button>
          </div>
        </form>
      </ModalWrapper>

      {/* --- Bulk Import Modal --- */}
      <ModalWrapper
        isOpen={showBulkImportModal}
        onClose={() => { setShowBulkImportModal(false); setBulkImportFile(null); }}
        modalId="bulk-import-modal"
        contentClassName="bg-white w-full max-w-md overflow-hidden rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-[#EAEBF0]"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#EAEBF0] bg-[#FFFDF3]">
          <h3 className="text-lg font-bold text-[#101625]">BULK IMPORT (CSV)</h3>
          <button type="button" onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} className="p-2 rounded-xl bg-white shadow-sm border border-[#EAEBF0] text-[#A4ABAF] hover:bg-[#fcc93d] hover:text-[#101625] transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-[12px] text-[#667180] font-medium leading-relaxed">
            Upload a CSV file to bulk import coaches. Required headers:
            <code className="block mt-3 bg-[#FFFDF3] text-[#101625] px-4 py-3 rounded-xl text-[11px] font-mono font-bold border border-[#EAEBF0] text-center">
              first_name, last_name, email, phone, specialization, status
            </code>
          </p>

          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-[#EAEBF0] text-[#101625] rounded-xl font-bold text-[12px] hover:bg-[#FFFDF3] hover:border-[#fcc93d] transition-all shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-[#fcc93d]" /> Download Sample File
          </button>

          <div>
            <label className="block text-[10px] font-bold text-[#A4ABAF] uppercase tracking-wider mb-2" htmlFor="csvFile">Select Dataset</label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              className="w-full text-sm file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-[12px] file:font-bold file:bg-[#FFFDF3] file:text-[#101625] hover:file:bg-[#FFD700] transition-all cursor-pointer bg-white border border-[#EAEBF0] rounded-xl outline-none"
              onChange={(e) => setBulkImportFile(e.target.files[0])}
            />
          </div>

          <div className="pt-4 border-t border-[#EAEBF0] mt-6">
            <motion.button
              whileHover={{ scale: (bulkImportUploading || !bulkImportFile) ? 1 : 1.02 }}
              whileTap={{ scale: (bulkImportUploading || !bulkImportFile) ? 1 : 0.98 }}
              type="button"
              onClick={handleBulkImport}
              className="w-full py-4 bg-[#EF4466] text-white rounded-xl font-bold text-[13px] hover:bg-[#dc3c5c] shadow-[0_4px_12px_rgba(239,68,102,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={bulkImportUploading || !bulkImportFile}
            >
              {bulkImportUploading ? <Loader /> : 'START MIGRATION'}
            </motion.button>
          </div>
        </div>
      </ModalWrapper>
    </motion.div>
  );
}