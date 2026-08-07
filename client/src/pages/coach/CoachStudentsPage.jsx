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
        ? (student.attendance_summary.present_count / (student.attendance_summary.present_count + student.attendance_summary.absent_count || 1)) * 100 
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
      <div className="p-2 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6 shadow-sm">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-7 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-2">
        <div className="alert alert-error">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6">
      
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Students Directory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and view student rosters from your assigned training batches.
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* KPI Stats Cards */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-2 lg:grid-cols-6"
      >
        {/* Total Students */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Students</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{stats.total_students}</h3>
            <div className="text-[10px] text-muted-foreground font-bold mt-1">Roster total</div>
          </div>
        </motion.div>
        
        {/* Present Today */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Present Today</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-emerald-600">{stats.present_today}</h3>
            <div className="text-[10px] text-emerald-500 font-bold mt-1">Marked present</div>
          </div>
        </motion.div>
        
        {/* Absent Today */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Absent Today</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-550">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-rose-600">{stats.absent_today}</h3>
            <div className="text-[10px] text-rose-500 font-bold mt-1">Marked absent</div>
          </div>
        </motion.div>
        
        {/* Pending Fees */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending Fees</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-rose-600">{stats.pending_fees}</h3>
            <div className="text-[10px] text-muted-foreground font-bold mt-1">Unpaid dues</div>
          </div>
        </motion.div>
        
        {/* Boys */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Boys</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{stats.boys}</h3>
            <div className="text-[10px] text-muted-foreground font-bold mt-1">Male trainees</div>
          </div>
        </motion.div>
        
        {/* Girls */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm text-left"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Girls</span>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{stats.girls}</h3>
            <div className="text-[10px] text-muted-foreground font-bold mt-1">Female trainees</div>
          </div>
        </motion.div>
      </motion.section>
      
      {/* Filters Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-foreground text-sm">Directory Filters</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-primary hover:text-primary/80 font-bold"
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
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="input-field pl-10 text-sm py-2"
                  />
                </div>
                
                {/* Batch */}
                <select
                  value={filters.batch_id}
                  onChange={(e) => setFilters({ ...filters, batch_id: e.target.value })}
                  className="input-field text-sm py-2 bg-card"
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
                  className="input-field text-sm py-2 bg-card"
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
                  className="input-field text-sm py-2 bg-card"
                >
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {/* Category */}
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="input-field text-sm py-2 bg-card"
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
                  className="input-field text-sm py-2 bg-card"
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
                  className="input-field text-sm py-2 bg-card"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                
                {/* Clear Filters */}
                <button
                  onClick={clearFilters}
                  className="btn btn-secondary flex items-center justify-center gap-2 py-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
              
              {/* Height & Weight Range */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap font-bold">Height (cm):</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.height_min}
                    onChange={(e) => setFilters({ ...filters, height_min: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.height_max}
                    onChange={(e) => setFilters({ ...filters, height_max: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap font-bold">Weight (kg):</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.weight_min}
                    onChange={(e) => setFilters({ ...filters, weight_min: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.weight_max}
                    onChange={(e) => setFilters({ ...filters, weight_max: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap font-bold">Attendance %:</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.attendance_min}
                    onChange={(e) => setFilters({ ...filters, attendance_min: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.attendance_max}
                    onChange={(e) => setFilters({ ...filters, attendance_max: e.target.value })}
                    className="input-field text-xs py-1.5 px-2.5"
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
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase tracking-wider font-extrabold">
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
            <tbody className="divide-y divide-border/40">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground font-bold">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
                      <p>No students found matching your filters</p>
                      <button
                        onClick={clearFilters}
                        className="text-primary hover:text-primary/80 font-bold"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowProfileModal(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={student.profile_photo} name={student.name} size="sm" />
                        <div>
                          <p className="font-bold text-xs text-foreground">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">ID: {student.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-muted-foreground">{student.age ? `${student.age} yrs` : '—'}</td>
                    <td className="px-4 py-4 text-xs font-bold text-foreground">
                      {student.sport?.name || student.enrollments?.[0]?.sport?.name || '—'}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-muted-foreground">
                      {student.batch?.name || student.enrollments?.[0]?.batch?.name || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs font-black">
                        <span className="text-emerald-600">
                          {student.attendance_summary?.present_count || 0}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-rose-650">
                          {student.attendance_summary?.absent_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {student.fee_status === 'paid' ? (
                        <span className="badge bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">Paid</span>
                      ) : student.fee_status === 'partial' ? (
                        <span className="badge bg-warning/10 text-warning border border-warning/20 text-[9px] font-bold uppercase">Partial</span>
                      ) : (
                        <span className="badge bg-rose-500/10 text-rose-550 border border-rose-500/20 text-[9px] font-bold uppercase">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {student.status?.toUpperCase() === 'ACTIVE' ? (
                        <span className="badge bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">Active</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold uppercase">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
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
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                          onClick={() => handleEditStudent(student)}
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
            <div className="text-xs text-muted-foreground font-bold">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-foreground font-bold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.section>
      
      {/* View Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setShowProfileModal(false);
              setModalTab('profile');
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <Avatar src={selectedStudent.profile_photo} name={selectedStudent.name} size="lg" />
                  <div>
                    <h3 className="text-xl font-black text-foreground">{selectedStudent.name}</h3>
                    <p className="text-xs text-muted-foreground font-bold mt-0.5">Student ID: {selectedStudent.student_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setModalTab('profile');
                  }}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="px-6 pt-3 pb-1 border-b border-border/40 text-left">
                <div className="flex gap-2">
                  {['profile', 'attendance', 'performance', 'notes'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`px-3 py-1.5 capitalize transition-all text-xs font-bold ${
                        modalTab === tab 
                          ? 'bg-primary/10 text-primary rounded-xl border border-primary/20' 
                          : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl'
                      }`}
                      onClick={() => setModalTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] text-left">
                {modalTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Personal Info */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Personal Info</h4>
                        <div className="space-y-2 text-xs font-bold">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Age</span>
                            <span className="text-foreground">{selectedStudent.age || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gender</span>
                            <span className="text-foreground">{selectedStudent.gender || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date of Birth</span>
                            <span className="text-foreground">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Height</span>
                            <span className="text-foreground">{selectedStudent.height ? `${selectedStudent.height} cm` : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight</span>
                            <span className="text-foreground">{selectedStudent.weight ? `${selectedStudent.weight} kg` : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Blood Group</span>
                            <span className="text-foreground">{selectedStudent.blood_group || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category</span>
                            <span className="text-foreground">{selectedStudent.category || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Parent Info */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Parent Info</h4>
                        <div className="space-y-2 text-xs font-bold">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Name</span>
                            <span className="text-foreground">{selectedStudent.parent_name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Phone</span>
                            <span className="text-foreground">{selectedStudent.parent_phone || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Email</span>
                            <span className="text-foreground break-all">{selectedStudent.parent_email || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Academy Info */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Academy Info</h4>
                        <div className="space-y-2 text-xs font-bold">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sport</span>
                            <span className="text-foreground">{selectedStudent.sport?.name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Batch</span>
                            <span className="text-foreground">{selectedStudent.batch?.name || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Joining Date</span>
                            <span className="text-foreground">{selectedStudent.joining_date ? new Date(selectedStudent.joining_date).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fee Status</span>
                            <span className="text-foreground uppercase">{selectedStudent.fee_status || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Summary */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Performance Details</h4>
                        <div className="space-y-2 text-xs font-bold">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Attendance (P | A)</span>
                            <span className="text-foreground">
                              {selectedStudent.attendance_summary?.present_count || 0} | {selectedStudent.attendance_summary?.absent_count || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Attendance %</span>
                            <span className="text-foreground">
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
                  <div className="text-center py-12 text-xs text-muted-foreground font-bold">
                    Attendance history details are managed in the attendance portals.
                  </div>
                )}
                
                {modalTab === 'performance' && (
                  <div className="text-center py-12 text-xs text-muted-foreground font-bold">
                    Performance feedback records are available under tracker dashboards.
                  </div>
                )}
                
                {modalTab === 'notes' && (
                  <div className="text-center py-12 text-xs text-muted-foreground font-bold">
                    Notes logs and reports can be logged on the notes view.
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setShowEditModal(false);
              setEditPhotoPreview(null);
              setEditStudentForm(prev => ({ ...prev, profile_photo: null }));
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border/60 flex items-center justify-between">
                <h3 className="text-lg font-black text-foreground">Edit Student Profile</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditPhotoPreview(null);
                    setEditStudentForm(prev => ({ ...prev, profile_photo: null }));
                  }}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditStudentSubmit} className="p-6 space-y-4 text-left">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border shadow bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-950 flex items-center justify-center">
                      {editPhotoPreview ? (
                        <img 
                          src={editPhotoPreview} 
                          alt="Student Photo" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">
                          {editStudentForm.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                      )}
                    </div>
                    
                    {/* Camera Overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <label htmlFor="editPhotoInput" className="cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                      </label>
                      <input
                        id="editPhotoInput"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleEditPhotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  {/* Photo Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById('editPhotoInput').click()}
                      className="btn btn-secondary py-1 px-3 text-xs"
                    >
                      Change Photo
                    </button>
                    
                    {editPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => setShowRemovePhotoConfirm(true)}
                        className="btn btn-danger py-1 px-3 text-xs"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Remove Photo Confirmation Modal */}
                {showRemovePhotoConfirm && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                      <h4 className="text-base font-black text-foreground mb-1">Remove Photo?</h4>
                      <p className="text-xs text-muted-foreground font-bold mb-4">
                        This action will remove the student's profile photo.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowRemovePhotoConfirm(false)}
                          className="btn btn-secondary py-1 px-3 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="btn btn-danger py-1 px-3 text-xs"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Student Name */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editName">
                    Student Name
                  </label>
                  <input
                    id="editName"
                    type="text"
                    className="input-field w-full text-xs py-2 px-3"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editParentName">
                      Parent Name
                    </label>
                    <input
                      id="editParentName"
                      type="text"
                      className="input-field w-full text-xs py-2 px-3"
                      value={editStudentForm.parent_name || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parent_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editParentEmail">
                      Parent Email
                    </label>
                    <input
                      id="editParentEmail"
                      type="email"
                      className="input-field w-full text-xs py-2 px-3"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editParentPhone">
                      Parent Phone
                    </label>
                    <input
                      id="editParentPhone"
                      type="tel"
                      className="input-field w-full text-xs py-2 px-3"
                      value={editStudentForm.parent_phone || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parent_phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editPhone">
                      Student Phone
                    </label>
                    <input
                      id="editPhone"
                      type="tel"
                      className="input-field w-full text-xs py-2 px-3"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editAge">
                      Age
                    </label>
                    <input
                      id="editAge"
                      type="number"
                      className="input-field w-full text-xs py-2 px-3"
                      value={editStudentForm.age || ''}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, age: e.target.value })
                      }
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editGender">
                      Gender
                    </label>
                    <select
                      id="editGender"
                      className="input-field w-full text-xs py-2 px-3 bg-card"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editBloodGroup">
                      Blood Group
                    </label>
                    <select
                      id="editBloodGroup"
                      className="input-field w-full text-xs py-2 px-3 bg-card"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editHeight">
                      Height (cm)
                    </label>
                    <input
                      id="editHeight"
                      type="number"
                      className="input-field w-full text-xs py-2 px-3"
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
                    <label className="block text-xs font-bold text-muted-foreground mb-1" htmlFor="editWeight">
                      Weight (kg)
                    </label>
                    <input
                      id="editWeight"
                      type="number"
                      className="input-field w-full text-xs py-2 px-3"
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
                
                {/* Save Message */}
                {saveMessage.text && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold ${
                    saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                    saveMessage.type === 'error' ? 'bg-rose-500/10 text-rose-600' :
                    'bg-blue-500/10 text-blue-605'
                  }`}>
                    {saveMessage.text}
                  </div>
                )}
                
                {/* Submit Button */}
                <div className="flex gap-2.5 justify-end pt-4 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditPhotoPreview(null);
                      setEditStudentForm(prev => ({ ...prev, profile_photo: null }));
                    }}
                    className="btn btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary text-xs py-2 px-6"
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
