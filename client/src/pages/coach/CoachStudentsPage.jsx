import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Search, X, Filter, GraduationCap, Users, CheckCircle, XCircle, Wallet, User, UserCheck, AlertCircle, Camera } from 'lucide-react';
import { coachGet, adminPut } from '../../api/client';
import Avatar from '../../components/Avatar';
import Loader from '../../components/Loader';

export default function CoachStudentsPage() {
  const navigate = useNavigate();
  
  // Data state
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    pending_fees: 0,
    boys: 0,
    girls: 0,
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    batch_id: '',
    sport_id: '',
    gender: '',
    category: '',
    height_min: '',
    height_max: '',
    weight_min: '',
    weight_max: '',
    fee_status: '',
    status: '',
    attendance_min: '',
    attendance_max: '',
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalTab, setModalTab] = useState('profile');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Edit form state
  const [editStudentForm, setEditStudentForm] = useState({
    student_id: null,
    name: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    phone: '',
    age: '',
    gender: '',
    blood_group: '',
    height: '',
    weight: '',
    joining_date: '',
    profile_photo: null,
  });
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });
  
  // Load data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsResult, batchesResult, sportsResult] = await Promise.all([
        coachGet('/coach/students-fee-summary'),
        coachGet('/coach/batches'),
        coachGet('/coach/sports'),
      ]);
      
      setStudents(Array.isArray(studentsResult.data?.students) ? studentsResult.data.students : []);
      setBatches(Array.isArray(batchesResult.data) ? batchesResult.data : Array.isArray(batchesResult.data?.data) ? batchesResult.data.data : []);
      setSports(Array.isArray(sportsResult.data) ? sportsResult.data : Array.isArray(sportsResult.data?.data) ? sportsResult.data.data : []);
      
      // Calculate statistics
      const studentsList = studentsResult.data?.students || [];
      setStats({
        total_students: studentsList.length,
        present_today: studentsList.filter(s => s.attendance_summary?.present_today > 0).length,
        absent_today: studentsList.filter(s => s.attendance_summary?.absent_today > 0).length,
        pending_fees: studentsList.filter(s => s.fee_status === 'unpaid' || s.fee_status === 'partial').length,
        boys: studentsList.filter(s => s.gender === 'MALE').length,
        girls: studentsList.filter(s => s.gender === 'FEMALE').length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter students
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(student => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          student.name?.toLowerCase().includes(searchLower) ||
          student.student_id?.toString().includes(searchLower) ||
          student.parent_name?.toLowerCase().includes(searchLower) ||
          student.phone?.includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Batch filter
      if (filters.batch_id && student.batch_id !== parseInt(filters.batch_id)) return false;
      
      // Sport filter
      if (filters.sport_id && student.sport_id !== parseInt(filters.sport_id)) return false;
      
      // Gender filter
      if (filters.gender && student.gender !== filters.gender) return false;
      
      // Category filter
      if (filters.category && student.category !== filters.category) return false;
      
      // Height filter
      if (filters.height_min && student.height < parseFloat(filters.height_min)) return false;
      if (filters.height_max && student.height > parseFloat(filters.height_max)) return false;
      
      // Weight filter
      if (filters.weight_min && student.weight < parseFloat(filters.weight_min)) return false;
      if (filters.weight_max && student.weight > parseFloat(filters.weight_max)) return false;
      
      // Fee status filter
      if (filters.fee_status && student.fee_status !== filters.fee_status) return false;
      
      // Status filter
      if (filters.status && student.status !== filters.status) return false;
      
      // Attendance % filter
      const attendancePercent = student.attendance_summary 
        ? (student.attendance_summary.present_count / (student.attendance_summary.present_count + student.attendance_summary.absent_count)) * 100 
        : 0;
      if (filters.attendance_min && attendancePercent < parseFloat(filters.attendance_min)) return false;
      if (filters.attendance_max && attendancePercent > parseFloat(filters.attendance_max)) return false;
      
      return true;
    });
  }, [students, filters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      batch_id: '',
      sport_id: '',
      gender: '',
      category: '',
      height_min: '',
      height_max: '',
      weight_min: '',
      weight_max: '',
      fee_status: '',
      status: '',
      attendance_min: '',
      attendance_max: '',
    });
    setCurrentPage(1);
  };
  
  // Edit form handlers
  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditStudentForm({
      student_id: student.student_id,
      name: student.name || '',
      parent_name: student.parent_name || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
      phone: student.phone || '',
      age: student.age || '',
      gender: student.gender || '',
      blood_group: student.blood_group || '',
      height: student.height || '',
      weight: student.weight || '',
      joining_date: student.joining_date ? student.joining_date.split('T')[0] : '',
      profile_photo: student.profile_photo || null,
    });
    setEditPhotoPreview(student.profile_photo || null);
    setSaveMessage({ text: '', type: '' });
    setShowEditModal(true);
  };
  
  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setSaveMessage({ text: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.', type: 'error' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setSaveMessage({ text: 'File size exceeds 5MB limit.', type: 'error' });
        return;
      }
      setSaveMessage({ text: '', type: '' });
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditPhotoPreview(e.target.result);
        setEditStudentForm({ ...editStudentForm, profile_photo: file });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemovePhoto = () => {
    setEditStudentForm({ ...editStudentForm, profile_photo: null });
    setEditPhotoPreview(null);
    setShowRemovePhotoConfirm(false);
    setSaveMessage({ text: 'Photo will be removed on save', type: 'info' });
  };
  
  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ text: '', type: '' });
    
    try {
      let profilePhotoData = undefined;
      if (editStudentForm.profile_photo instanceof File) {
        profilePhotoData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(editStudentForm.profile_photo);
        });
      } else if (editStudentForm.profile_photo === null) {
        profilePhotoData = null;
      }
      
      const payload = {
        name: editStudentForm.name,
        parent_name: editStudentForm.parent_name,
        parent_email: editStudentForm.parent_email,
        parent_phone: editStudentForm.parent_phone,
        phone: editStudentForm.phone,
        age: editStudentForm.age ? parseInt(editStudentForm.age) : null,
        gender: editStudentForm.gender,
        blood_group: editStudentForm.blood_group,
        height: editStudentForm.height ? parseFloat(editStudentForm.height) : null,
        weight: editStudentForm.weight ? parseFloat(editStudentForm.weight) : null,
        joining_date: editStudentForm.joining_date || null,
        profile_photo: profilePhotoData,
      };
      
      await adminPut(`/admin/students/${editStudentForm.student_id}`, payload);
      setSaveMessage({ text: 'Student updated successfully.', type: 'success' });
      
      // Reload student data
      await loadData();
      
      // Update selected student if modal is still open
      if (selectedStudent && selectedStudent.student_id === editStudentForm.student_id) {
        const updatedStudent = students.find(s => s.student_id === editStudentForm.student_id);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }
      
      setTimeout(() => {
        setShowEditModal(false);
        setEditPhotoPreview(null);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to update student:', error);
      setSaveMessage({ text: 'Failed to update student. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
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
  
  if (loading) {
    return (
      <div className="p-6 space-y-8">
        {/* Dashboard Cards Skeleton */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-4 bg-surface-secondary rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-surface-secondary rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="h-16 bg-surface-secondary rounded animate-pulse"></div>
        
        {/* Table Skeleton */}
        <div className="card p-5 space-y-4">
          <div className="h-6 bg-surface-secondary rounded w-3/4 animate-pulse"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-surface-secondary rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="alert-error border-danger/30 bg-danger/10 text-danger rounded-xl p-4 shadow-sm">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-full w-full">
      <motion.div
        className="relative z-10 space-y-6 p-6 w-full overflow-x-hidden bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              Students
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Manage students from your assigned batches
            </p>
          </div>
        </div>
        
        {/* Dashboard Cards */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-primary bg-gradient-to-br from-surface to-primary/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Total Students</span>
              <Users className="w-5 h-5 text-primary opacity-80" />
            </div>
            <span className="text-3xl font-black text-foreground">{stats.total_students}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-emerald bg-gradient-to-br from-surface to-emerald/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald">Present Today</span>
              <CheckCircle className="w-5 h-5 text-emerald opacity-80" />
            </div>
            <span className="text-3xl font-black text-emerald">{stats.present_today}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-rose bg-gradient-to-br from-surface to-rose/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose">Absent Today</span>
              <XCircle className="w-5 h-5 text-rose opacity-80" />
            </div>
            <span className="text-3xl font-black text-rose">{stats.absent_today}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-warning bg-gradient-to-br from-surface to-warning/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-warning">Pending Fees</span>
              <Wallet className="w-5 h-5 text-warning opacity-80" />
            </div>
            <span className="text-3xl font-black text-warning">{stats.pending_fees}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-blue bg-gradient-to-br from-surface to-blue/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue">Boys</span>
              <User className="w-5 h-5 text-blue opacity-80" />
            </div>
            <span className="text-3xl font-black text-blue">{stats.boys}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card p-5 flex flex-col justify-center gap-2 border-t-4 border-t-purple bg-gradient-to-br from-surface to-purple/5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple">Girls</span>
              <UserCheck className="w-5 h-5 text-purple opacity-80" />
            </div>
            <span className="text-3xl font-black text-purple">{stats.girls}</span>
          </motion.div>
        </motion.section>
        
        {/* Filters Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Filters</h3>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-primary hover:text-primary/80 font-semibold"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  {/* Batch */}
                  <select
                    value={filters.batch_id}
                    onChange={(e) => setFilters({ ...filters, batch_id: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Batches</option>
                    {Array.isArray(batches) && batches.map(batch => (
                      <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>
                    ))}
                  </select>
                  
                  {/* Sport */}
                  <select
                    value={filters.sport_id}
                    onChange={(e) => setFilters({ ...filters, sport_id: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Sports</option>
                    {Array.isArray(sports) && sports.map(sport => (
                      <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
                    ))}
                  </select>
                  
                  {/* Gender */}
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Genders</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Category */}
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Categories</option>
                    <option value="U8">U8</option>
                    <option value="U10">U10</option>
                    <option value="U12">U12</option>
                    <option value="U14">U14</option>
                    <option value="U16">U16</option>
                    <option value="U18">U18</option>
                    <option value="Senior">Senior</option>
                  </select>
                  
                  {/* Fee Status */}
                  <select
                    value={filters.fee_status}
                    onChange={(e) => setFilters({ ...filters, fee_status: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Fee Status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                  </select>
                  
                  {/* Student Status */}
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  
                  {/* Clear Filters */}
                  <button
                    onClick={clearFilters}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface-secondary text-foreground text-sm hover:bg-surface transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
                
                {/* Height & Weight Range */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Height (cm):</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.height_min}
                      onChange={(e) => setFilters({ ...filters, height_min: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.height_max}
                      onChange={(e) => setFilters({ ...filters, height_max: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Weight (kg):</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.weight_min}
                      onChange={(e) => setFilters({ ...filters, weight_min: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.weight_max}
                      onChange={(e) => setFilters({ ...filters, weight_max: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Attendance %:</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.attendance_min}
                      onChange={(e) => setFilters({ ...filters, attendance_min: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.attendance_max}
                      onChange={(e) => setFilters({ ...filters, attendance_max: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
        
        {/* Students Table */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-surface z-10 border-b border-border">
                <tr className="border-border text-muted text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-4 py-4">Age</th>
                  <th className="px-4 py-4">Sport</th>
                  <th className="px-4 py-4">Batch</th>
                  <th className="px-4 py-4">Attendance</th>
                  <th className="px-4 py-4">Fee Status</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/50" />
                        <p>No students found matching your filters</p>
                        <button
                          onClick={clearFilters}
                          className="text-primary hover:text-primary/80 font-semibold"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, index) => (
                    <motion.tr
                      key={student.student_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                      className="text-foreground cursor-pointer"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowProfileModal(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={student.profile_photo} name={student.name} size="sm" />
                          <div>
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-muted text-xs">ID: {student.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted">{student.age || '—'}</td>
                      <td className="px-4 py-4">
                        {student.sport?.name || student.enrollments?.[0]?.sport?.name || '—'}
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {student.batch?.name || student.enrollments?.[0]?.batch?.name || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="text-emerald-600">
                            {student.attendance_summary?.present_count || 0}
                          </span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-rose-600">
                            {student.attendance_summary?.absent_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {student.fee_status === 'paid' ? (
                          <span className="badge-active">Paid</span>
                        ) : student.fee_status === 'partial' ? (
                          <span className="badge bg-warning/10 text-warning border-warning/20">Partial</span>
                        ) : (
                          <span className="badge-inactive">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {student.status?.toUpperCase() === 'ACTIVE' ? (
                          <span className="badge-active">Active</span>
                        ) : (
                          <span className="badge-inactive">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowProfileModal(true);
                            }}
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowEditModal(true);
                            }}
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-foreground text-sm hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg border border-border bg-surface text-foreground text-sm hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.section>
      </motion.div>
      
      {/* View Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border/50"
            >
              <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedStudent.profile_photo} name={selectedStudent.name} size="lg" />
                    <div>
                      <h2 className="text-2xl font-black text-foreground">{selectedStudent.name}</h2>
                      <p className="text-sm text-muted-foreground">Student ID: {selectedStudent.student_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      setModalTab('profile');
                    }}
                    className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="px-6 pt-4 border-b border-border/50">
                <div className="flex gap-2">
                  {['profile', 'attendance', 'performance', 'notes'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`px-4 py-2 capitalize transition-all duration-300 ${
                        modalTab === tab 
                          ? 'border-primary text-primary bg-primary/10 rounded-t-lg border-b-2 font-semibold' 
                          : 'hover:text-primary text-muted-foreground hover:bg-surface-secondary'
                      }`}
                      onClick={() => setModalTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {modalTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Profile Photo Section */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {selectedStudent.profile_photo ? (
                          <img
                            src={selectedStudent.profile_photo}
                            alt={selectedStudent.name}
                            className="h-24 w-24 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl font-semibold text-white">
                            {selectedStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Profile photo</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Personal Info */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Age</span>
                            <span className="font-semibold">{selectedStudent.age || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gender</span>
                            <span className="font-semibold">{selectedStudent.gender || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date of Birth</span>
                            <span className="font-semibold">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Height</span>
                            <span className="font-semibold">{selectedStudent.height ? `${selectedStudent.height} cm` : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight</span>
                            <span className="font-semibold">{selectedStudent.weight ? `${selectedStudent.weight} kg` : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Blood Group</span>
                            <span className="font-semibold">{selectedStudent.blood_group || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category</span>
                            <span className="font-semibold">{selectedStudent.category || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Parent Info */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Parent Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Name</span>
                            <span className="font-semibold">{selectedStudent.parent_name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Phone</span>
                            <span className="font-semibold">{selectedStudent.parent_phone || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Email</span>
                            <span className="font-semibold">{selectedStudent.parent_email || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Academy Info */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Academy Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sport</span>
                            <span className="font-semibold">{selectedStudent.sport?.name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Batch</span>
                            <span className="font-semibold">{selectedStudent.batch?.name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Joining Date</span>
                            <span className="font-semibold">{selectedStudent.joining_date ? new Date(selectedStudent.joining_date).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fee Status</span>
                            <span className="font-semibold">{selectedStudent.fee_status || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Performance</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Attendance</span>
                            <span className="font-semibold">
                              {selectedStudent.attendance_summary?.present_count || 0} | {selectedStudent.attendance_summary?.absent_count || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Attendance %</span>
                            <span className="font-semibold">
                              {selectedStudent.attendance_summary 
                                ? Math.round((selectedStudent.attendance_summary.present_count / (selectedStudent.attendance_summary.present_count + selectedStudent.attendance_summary.absent_count || 1)) * 100)
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {modalTab === 'attendance' && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Attendance tab - Coming soon</p>
                  </div>
                )}
                
                {modalTab === 'performance' && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Performance tab - Coming soon</p>
                  </div>
                )}
                
                {modalTab === 'notes' && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Notes tab - Coming soon</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Student Modal */}
      <AnimatePresence>
        {showEditModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border/50"
            >
              <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-foreground">Edit Student Profile</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditPhotoPreview(null);
                      setEditStudentForm(prev => ({ ...prev, profile_photo: null }));
                    }}
                    className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEditStudentSubmit} className="p-6 space-y-4">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center mb-6">
                  <motion.div 
                    className="relative group"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200 shadow-lg bg-gradient-to-br from-slate-100 to-slate-200">
                      {editPhotoPreview ? (
                        <img 
                          src={editPhotoPreview} 
                          alt="Student Photo" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600">
                          <span className="text-4xl font-bold text-white">
                            {editStudentForm.name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Camera Overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <label htmlFor="editPhotoInput" className="cursor-pointer">
                        <Camera className="w-8 h-8 text-white" />
                      </label>
                      <input
                        id="editPhotoInput"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleEditPhotoChange}
                        className="hidden"
                      />
                    </div>
                  </motion.div>
                  
                  {/* Photo Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => document.getElementById('editPhotoInput').click()}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                    >
                      <Camera className="w-4 h-4" />
                      Change Photo
                    </motion.button>
                    
                    {editPhotoPreview && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowRemovePhotoConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                        Remove Photo
                      </motion.button>
                    )}
                  </div>
                  
                  {/* File Validation Hint */}
                  <p className="text-xs text-slate-500 mt-2">
                    Supported formats: JPG, PNG, WEBP (max 5MB)
                  </p>
                </div>
                
                {/* Remove Photo Confirmation Modal */}
                {showRemovePhotoConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
                    >
                      <h4 className="text-lg font-bold text-slate-800 mb-2">Remove Photo?</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        This action will remove the student's profile photo. This cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowRemovePhotoConfirm(false)}
                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleRemovePhoto}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          Remove Photo
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Student Name */}
                <div>
                  <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editName">
                    Student Name
                  </label>
                  <input
                    id="editName"
                    type="text"
                    className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                    value={editStudentForm.name || ''}
                    onChange={(e) =>
                      setEditStudentForm({ ...editStudentForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                
                {/* Parent Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editParentName">
                      Parent Name
                    </label>
                    <input
                      id="editParentName"
                      type="text"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.parent_name || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parent_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editParentEmail">
                      Parent Email
                    </label>
                    <input
                      id="editParentEmail"
                      type="email"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.parent_email || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parent_email: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                {/* Contact Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editParentPhone">
                      Parent Phone
                    </label>
                    <input
                      id="editParentPhone"
                      type="tel"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.parent_phone || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parent_phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editPhone">
                      Student Phone
                    </label>
                    <input
                      id="editPhone"
                      type="tel"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.phone || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                {/* Demographics Row */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editAge">
                      Age
                    </label>
                    <input
                      id="editAge"
                      type="number"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.age || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, age: e.target.value })
                      }
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editGender">
                      Gender
                    </label>
                    <select
                      id="editGender"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.gender || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, gender: e.target.value })
                      }
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editBloodGroup">
                      Blood Group
                    </label>
                    <select
                      id="editBloodGroup"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.blood_group || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, blood_group: e.target.value })
                      }
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
                
                {/* Physical Attributes */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editHeight">
                      Height (cm)
                    </label>
                    <input
                      id="editHeight"
                      type="number"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.height || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, height: e.target.value })
                      }
                      min="50"
                      max="250"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editWeight">
                      Weight (kg)
                    </label>
                    <input
                      id="editWeight"
                      type="number"
                      className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                      value={editStudentForm.weight || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, weight: e.target.value })
                      }
                      min="10"
                      max="200"
                      step="0.1"
                    />
                  </div>
                </div>
                
                {/* Joining Date */}
                <div>
                  <label className="label block text-sm font-medium text-foreground mb-1" htmlFor="editJoiningDate">
                    Joining Date
                  </label>
                  <input
                    id="editJoiningDate"
                    type="date"
                    className="input-field w-full p-2 border rounded-md bg-surface text-foreground"
                    value={editStudentForm.joining_date || ''}
                    onChange={(e) =>
                      setEditStudentForm({ ...editStudentForm, joining_date: e.target.value })
                    }
                  />
                </div>
                
                {/* Save Message */}
                {saveMessage.text && (
                  <div className={`p-3 rounded-lg text-sm ${
                    saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                    saveMessage.type === 'error' ? 'bg-red-500/10 text-red-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {saveMessage.text}
                  </div>
                )}
                
                {/* Submit Button */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditPhotoPreview(null);
                      setEditStudentForm(prev => ({ ...prev, profile_photo: null }));
                    }}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm hover:bg-surface-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
