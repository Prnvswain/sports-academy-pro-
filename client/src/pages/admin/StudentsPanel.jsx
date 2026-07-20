import { useCallback, useEffect, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { Eye, Lock, Unlock, Trash2, Edit, Camera, X, Wallet, ChevronLeft, ChevronRight, Calendar, Pause, Play, Key, Filter } from 'lucide-react';

import Loader from '../../components/Loader';

import Avatar from '../../components/Avatar';

import { useFormDraft } from '../../hooks/useFormDraft';

import { useFormValidation, validationRules } from '../../hooks/useFormValidation';

import { adminDelete, adminGet, adminPost, adminPut } from '../../api/client';

import { calculateStudentFee, getPlanName, calculateBalance } from '../../utils/fee.util.js';



const formatCurrency = (value) =>

  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';



const normalizeGender = (gender) => {

  if (!gender) return 'Not Specified';

  const normalized = gender.toString().toLowerCase().trim();

  if (['male', 'm'].includes(normalized)) return 'Male';

  if (['female', 'f'].includes(normalized)) return 'Female';

  if (['other'].includes(normalized)) return 'Other';

  return 'Not Specified';

};



// Calendar helper functions

const getDaysInMonth = (date) => {

  const year = date.getFullYear();

  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);

  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();

  const startDayOfWeek = firstDay.getDay();



  const days = [];

  // Add empty cells for days before the first day of the month

  for (let i = 0; i < startDayOfWeek; i++) {

    days.push(null);

  }

  // Add days of the month

  for (let i = 1; i <= daysInMonth; i++) {

    days.push(new Date(year, month, i));

  }

  return days;

};



const isSameDay = (date1, date2) => {

  if (!date1 || !date2) return false;

  return (

    date1.getFullYear() === date2.getFullYear() &&

    date1.getMonth() === date2.getMonth() &&

    date1.getDate() === date2.getDate()

  );

};



const isSunday = (date) => {

  return date.getDay() === 0;

};



const isToday = (date) => {

  const today = new Date();

  return isSameDay(date, today);

};



const isFutureDate = (date) => {

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date > today;

};



const getAttendanceForDate = (attendanceRecords, date) => {

  if (!attendanceRecords || !date) return null;

  return attendanceRecords.find((record) => {

    const recordDate = new Date(record.date);

    return isSameDay(recordDate, date);

  });

};



const getAttendanceColor = (date, attendanceRecords, selectedDate) => {

  if (isToday(date)) return 'bg-blue-500 text-white';

  if (isSunday(date)) return 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300';

  if (isFutureDate(date)) return 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600';



  const attendance = getAttendanceForDate(attendanceRecords, date);

  if (attendance) {

    if (attendance.status === 'PRESENT') return 'bg-green-500 text-white';

    if (attendance.status === 'ABSENT') return 'bg-red-600 text-white';

    if (attendance.status === 'LATE') return 'bg-yellow-500 text-white';

  }



  return 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

};



const renderFinancialLedgerSummary = (studentData, durationPlans = []) => {

  const studentRecord = studentData?.student || studentData || {};

  const activeEnrollments = studentData?.enrollments?.filter((enrollment) => enrollment?.is_active) || [];

  const latestEnrollment = activeEnrollments[0] || studentData?.enrollments?.[0] || null;



  const globalDurationPlans = durationPlans || [];

  const currentStudentPlan =

    latestEnrollment?.duration_plan?.name ||

    studentRecord?.duration_plan ||

    studentRecord?.durationPlan ||

    '';



  const exactPlanMatch = globalDurationPlans.find(

    (plan) =>

      plan.name === currentStudentPlan ||

      plan._id === currentStudentPlan ||

      plan.id === currentStudentPlan ||

      plan.plan_id === currentStudentPlan,

  );



  // Use the centralized fee calculation utility

  const feeBreakdown = calculateStudentFee(latestEnrollment);

  const balanceInfo = calculateBalance(

    latestEnrollment,

    studentRecord?.amount_paid || studentRecord?.amountPaid || studentData?.amount_paid || studentData?.amountPaid || 0

  );

  const durationPlanName = getPlanName(latestEnrollment);



  return (

    <motion.div

      initial={{ opacity: 0, y: 10 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.25 }}

      className="mb-6 overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm"

    >

      <div className="mb-4 flex items-center gap-3">

        <div className="rounded-full bg-emerald-600/10 p-2 text-emerald-600">

          <Wallet className="h-5 w-5" />

        </div>

        <div>

          <h4 className="font-semibold text-slate-800">Financial Ledger Summary</h4>

          <p className="text-xs text-slate-500">Current fee snapshot from the student ledger</p>

        </div>

      </div>



      <div className="grid gap-3 md:grid-cols-2">

        <div className="rounded-lg border border-slate-200 bg-white/70 p-3">

          <div className="flex items-center justify-between text-sm">

            <span className="text-slate-600">Sports Base Fee</span>

            <span className="font-semibold text-slate-800">₹{formatCurrency(feeBreakdown.sportsBaseFee)}</span>

          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">

            <span>Plan Multiplier</span>

            <span className="font-medium text-slate-700">

              {Number.isFinite(Number(feeBreakdown.planMultiplier)) ? Number(feeBreakdown.planMultiplier).toFixed(1) : '1.0'}x

              {' '}({durationPlanName})

            </span>

          </div>

        </div>



        <div className="rounded-lg border border-slate-200 bg-white/70 p-3">

          <div className="flex items-center justify-between text-sm">

            <span className="text-slate-600">Sports Fee</span>

            <span className="font-semibold text-slate-800">₹{formatCurrency(feeBreakdown.sportsFee)}</span>

          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">

            <span>Registration Fee</span>

            <span className="font-medium text-slate-700">₹{formatCurrency(feeBreakdown.registrationFee)}</span>

          </div>

        </div>



        <div className="rounded-lg border border-slate-200 bg-white/70 p-3">

          <div className="flex items-center justify-between text-sm">

            <span className="text-slate-600">Additional Charges</span>

            <span className="font-semibold text-slate-800">₹{formatCurrency(feeBreakdown.additionalCharges)}</span>

          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">

            <span>Discount</span>

            <span className="font-medium text-rose-600">-₹{formatCurrency(feeBreakdown.discount)}</span>

          </div>

        </div>



        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">

          <div className="flex items-center justify-between text-sm">

            <span className="text-slate-600">Total Computed Fee</span>

            <span className="font-semibold text-slate-800">₹{formatCurrency(feeBreakdown.totalComputedFee)}</span>

          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-emerald-700">

            <span>Amount Paid</span>

            <span className="font-medium">₹{formatCurrency(balanceInfo.amountPaid)}</span>

          </div>

        </div>



        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">

          <div className="flex items-center justify-between text-sm">

            <span className="text-slate-600">Balance Due</span>

            <span className="font-semibold text-slate-800">₹{formatCurrency(balanceInfo.balanceDue)}</span>

          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-rose-700">

            <span>Status</span>

            <span className="font-medium text-rose-700">

              {balanceInfo.balanceDue > 0 ? 'Pending' : 'Paid'}

            </span>

          </div>

        </div>

      </div>



      <div className={`mt-4 rounded-xl border p-4 ${balanceInfo.balanceDue > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-600 text-white'}`}>

        <div className="flex items-center justify-between">

          <span className={`text-sm font-semibold ${balanceInfo.balanceDue > 0 ? 'text-rose-700' : 'text-white'}`}>

            Total Balance Due

          </span>

          <span className={`text-lg font-bold ${balanceInfo.balanceDue > 0 ? 'text-rose-700' : 'text-white'}`}>

            ₹{formatCurrency(balanceInfo.balanceDue)}

          </span>

        </div>

      </div>

    </motion.div>

  );

};



const calculateAgeFromDOB = (dob) => {

  if (!dob) return null;

  const birthDate = new Date(dob);

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {

    age--;

  }

  return age;

};



const emptyForm = {

  firstName: '',

  middleName: '',

  lastName: '',

  dob: '',

  gender: 'Male',

  blood_group: '',

  parent_name: '',

  parent_email: '',

  parent_phone: '',

  phone: '',

  height: '',

  weight: '',

  profile_photo: null,

  batch_ids: [],

  duration_plan_id: '',

  registration_fee: '',

  additional_charges: '',

  discount: '',

  joining_date: new Date().toISOString().split('T')[0],

};



export default function StudentsPanel() {

  const { form, setForm, updateField, clearDraft, draftSavedAt } = useFormDraft(

    'sams_draft_student_form',

    emptyForm,

  );



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

      case 'firstName':

      case 'lastName':

        if (!value || value.trim() === '') {

          error = 'This field is required';

        }

        break;

      case 'parent_email':

        if (!value || value.trim() === '') {

          error = 'Parent email is required';

        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {

          error = 'Enter a valid email address';

        }

        break;

      case 'phone':

      case 'parent_phone':

        if (value && !/^[0-9]{10}$/.test(value)) {

          error = 'Phone number must be 10 digits';

        }

        break;

      case 'dob':

        if (!value) {

          error = 'Date of birth is required';

        } else {

          const birthDate = new Date(value);

          const today = new Date();

          if (birthDate > today) {

            error = 'Date of birth cannot be in the future';

          } else {

            const age = calculateAgeFromDOB(value);

            if (age < 1 || age > 100) {

              error = 'Age must be between 1 and 100';

            }

          }

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



  const [students, setStudents] = useState([]);

  const [sports, setSports] = useState([]);

  const [durationPlans, setDurationPlans] = useState([]);

  const [availableBatches, setAvailableBatches] = useState([]);

  const [editAvailableBatches, setEditAvailableBatches] = useState([]);

  const [selectedSports, setSelectedSports] = useState([]);

  const [isSportsDropdownOpen, setIsSportsDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState({ text: '', type: '' });

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [filterSport, setFilterSport] = useState('');

  const [filterBatch, setFilterBatch] = useState('');

  const [filterCategory, setFilterCategory] = useState('');

  const [filterGender, setFilterGender] = useState('');

  const [filterWeightClass, setFilterWeightClass] = useState('');

  const [customMaxAge, setCustomMaxAge] = useState('');

  const [customMaxWeight, setCustomMaxWeight] = useState('');

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showStudentModal, setShowStudentModal] = useState(false);

  const [modalTab, setModalTab] = useState('profile');

  const [studentDetails, setStudentDetails] = useState(null);

  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [bulkUploadFile, setBulkUploadFile] = useState(null);

  const [bulkUploadResults, setBulkUploadResults] = useState(null);

  const [isEditingStudent, setIsEditingStudent] = useState(false);

  const [editStudentForm, setEditStudentForm] = useState({});

  const [editSelectedSports, setEditSelectedSports] = useState([]);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const [photoPreview, setPhotoPreview] = useState(null);

  // Pause modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseStudent, setPauseStudent] = useState(null);
  const [pauseForm, setPauseForm] = useState({
    pause_start_date: new Date().toISOString().split('T')[0],
    pause_duration: '',
    pause_duration_unit: 'days',
    pause_end_date: '',
    pause_reason: ''
  });

  const [editPhotoPreview, setEditPhotoPreview] = useState(null);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);

  const [showFilterPanel, setShowFilterPanel] = useState(false);



  // Calendar state for attendance view

  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState(null);



  // Search query states for dropdowns

  const [sportSearchQuery, setSportSearchQuery] = useState('');

  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  const [isBatchesDropdownOpen, setIsBatchesDropdownOpen] = useState(false);



  const loadData = useCallback(async () => {

    setLoading(true);

    try {

      const [studentsRes, sportsRes, plansRes] = await Promise.all([

        adminGet('/admin/students'),

        adminGet('/admin/sports'),

        adminGet('/admin/duration-plans'),

      ]);

      setStudents(studentsRes.data || []);



      const sportsData = sportsRes.data;

      let sportsArray = [];

      if (Array.isArray(sportsData)) {

        sportsArray = sportsData;

      } else if (sportsData && Array.isArray(sportsData.data)) {

        sportsArray = sportsData.data;

      } else if (sportsData && Array.isArray(sportsData.available_sports)) {

        sportsArray = sportsData.available_sports;

      } else if (sportsData && Array.isArray(sportsData.sports)) {

        sportsArray = sportsData.sports;

      }

      setSports(sportsArray.filter((s) => s.status === 'ACTIVE'));



      setDurationPlans(plansRes.data || []);

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

      setSports([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadData();

  }, [loadData]);



  // Fetch batches for filter when sport is selected
  useEffect(() => {
    const fetchBatchesForFilter = async () => {
      if (!filterSport) {
        setAvailableBatches([]);
        setFilterBatch('');
        return;
      }

      try {
        const result = await adminGet(`/admin/batches?sport_id=${filterSport}`);
        setAvailableBatches(result.data || []);
      } catch (error) {
        console.error('Failed to load batches for filter:', error);
        setAvailableBatches([]);
      }
    };

    fetchBatchesForFilter();
  }, [filterSport]);



  useEffect(() => {

    if (!selectedSports || selectedSports.length === 0) {

      setAvailableBatches([]);

      setForm((prev) => ({ ...prev, batch_ids: [] }));

      return;

    }



    const loadBatches = async () => {

      try {

        const sportIds = selectedSports.join(',');

        const result = await adminGet(

          `/admin/batches/available?sport_ids=${encodeURIComponent(sportIds)}`,

        );

        setAvailableBatches(result.data || []);

        setForm((prev) => {

          const validBatchIds = (prev.batch_ids || []).filter(batchId =>

            (result.data || []).some((b) => String(b.batch_id) === String(batchId))

          );

          return { ...prev, batch_ids: validBatchIds };

        });

      } catch (error) {

        setMessage({ text: error.message, type: 'error' });

      }

    };



    loadBatches();

  }, [selectedSports, setForm]);



  // Load batches for Edit Student modal when sport changes

  useEffect(() => {

    if (!editStudentForm.sport_id) {

      setEditAvailableBatches([]);

      return;

    }



    const loadEditBatches = async () => {

      try {

        const result = await adminGet(

          `/admin/batches/available?sport_id=${editStudentForm.sport_id}`

        );

        setEditAvailableBatches(result.data || []);

      } catch (error) {

        setMessage({ text: error.message, type: 'error' });

      }

    };



    loadEditBatches();

  }, [editStudentForm.sport_id]);



  const handleBatchSelect = (batchId) => {

    const selectedBatch = availableBatches.find(b => b.batch_id === parseInt(batchId));

    if (!selectedBatch) return;



    setForm(prev => {

      const currentBatchIds = prev.batch_ids || [];

      const existingBatchIndex = currentBatchIds.findIndex(id => {

        const batch = availableBatches.find(b => b.batch_id === id);

        return batch && batch.sport_id === selectedBatch.sport_id;

      });



      if (existingBatchIndex !== -1) {

        const newBatchIds = [...currentBatchIds];

        newBatchIds[existingBatchIndex] = parseInt(batchId);

        return { ...prev, batch_ids: newBatchIds };

      }



      return { ...prev, batch_ids: [...currentBatchIds, parseInt(batchId)] };

    });

  };



  const handleEditBatchSelect = (batchId) => {

    const selectedBatch = availableBatches.find(b => b.batch_id === parseInt(batchId));

    if (!selectedBatch) return;



    setEditStudentForm(prev => {

      const currentBatchIds = prev.batch_ids || [];

      const existingBatchIndex = currentBatchIds.findIndex(id => {

        const batch = availableBatches.find(b => b.batch_id === id);

        return batch && batch.sport_id === selectedBatch.sport_id;

      });



      if (existingBatchIndex !== -1) {

        const newBatchIds = [...currentBatchIds];

        newBatchIds[existingBatchIndex] = parseInt(batchId);

        return { ...prev, batch_ids: newBatchIds };

      }



      return { ...prev, batch_ids: [...currentBatchIds, parseInt(batchId)] };

    });

  };



  const handleRemoveBatch = (batchId) => {

    setForm(prev => ({

      ...prev,

      batch_ids: (prev.batch_ids || []).filter(id => id !== batchId)

    }));

  };



  const calculateLiveFee = () => {

    const selectedSportIds = selectedSports || [];

    let totalSportsFee = 0;



    (selectedSportIds || []).forEach((sportId) => {

      const sport = (sports || []).find(

        (s) => s?.sport_id && String(s.sport_id) === String(sportId),

      );

      if (sport) {

        totalSportsFee += parseFloat(sport?.base_fee || sport?.baseFee || 0) || 0;

      }

    });



    const safePlansArray = durationPlans || [];

    const durationPlan = safePlansArray.find(

      (p) => p?.plan_id && String(p.plan_id) === String(form.duration_plan_id),

    );

    const multiplier = durationPlan ? parseFloat(durationPlan?.multiplier || 1) : 1;



    const sportsFeeWithMultiplier = totalSportsFee * (isNaN(multiplier) ? 1 : multiplier);

    const registrationFee = parseFloat(form?.registration_fee || form?.registrationFee || 0) || 0;

    const additionalCharges =

      parseFloat(form?.additional_charges || form?.additionalCharges || 0) || 0;

    const discount = parseFloat(form?.discount || 0) || 0;



    const finalFee = sportsFeeWithMultiplier + registrationFee + additionalCharges - discount;



    return {

      totalSportsFee,

      multiplier,

      sportsFeeWithMultiplier,

      registrationFee,

      additionalCharges,

      discount,

      finalFee,

    };

  };



  const handleSubmit = async (event) => {

    event.preventDefault();

    setMessage({ text: '', type: '' });

    setFieldErrors({});



    // Validate sports selection

    let isValid = true;



    if (!selectedSports || selectedSports.length === 0) {

      setFieldError('sport_ids', 'Please select at least one sport');

      isValid = false;

    }



    // Validate required fields (use | to avoid short-circuiting so all errors are shown)

    const isFirstNameValid = validateField('firstName', form.firstName);

    const isLastNameValid = validateField('lastName', form.lastName);

    const isParentEmailValid = validateField('parent_email', form.parent_email);

    const isDobValid = validateField('dob', form.dob);



    if (!isFirstNameValid || !isLastNameValid || !isParentEmailValid || !isDobValid) {

      isValid = false;

    }



    if (!isValid) {

      return;

    }



    try {

      const feeBreakdown = calculateLiveFee();

      const fullName = `${form.firstName} ${form.middleName} ${form.lastName}`.trim();



      // Handle profile photo - convert to base64 if file is selected

      let profilePhotoData = null;

      if (form.profile_photo instanceof File) {

        profilePhotoData = await new Promise((resolve, reject) => {

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);

          reader.onerror = reject;

          reader.readAsDataURL(form.profile_photo);

        });

      }



      let batchIdsValue = form.batch_ids ? form.batch_ids.map(id => parseInt(id, 10)) : [];

      console.log('[handleSubmit] batch_ids value:', {

        form_batch_ids: form.batch_ids,

        parsed_batch_ids: batchIdsValue,

      });



      const payload = {

        name: fullName,

        first_name: form.firstName.trim() || undefined,

        middle_name: form.middleName.trim() || undefined,

        last_name: form.lastName.trim() || undefined,

        phone: form.phone.trim() || undefined,

        dob: form.dob,

        age: calculateAgeFromDOB(form.dob),

        gender: form.gender,

        blood_group: form.bloodGroup || form.blood_group || undefined,

        height: form.height ? parseFloat(form.height) : undefined,

        weight: form.weight ? parseFloat(form.weight) : undefined,

        parent_name: form.parent_name.trim() || undefined,

        parent_email: form.parent_email.trim(),

        parent_phone: form.parent_phone.trim() || undefined,

        profile_photo: profilePhotoData,

        sport_ids: selectedSports.map((id) => parseInt(id, 10)),

        batch_ids: batchIdsValue,

        duration_plan_id: form.duration_plan_id ? parseInt(form.duration_plan_id, 10) : undefined,

        registration_fee: parseFloat(form.registrationFee || form.registration_fee || 0),

        additional_charges: parseFloat(form.additionalCharges || form.additional_charges || 0),

        discount: parseFloat(form.discount || 0),

        joining_date: form.joining_date,

      };



      console.log('[handleSubmit] Request payload:', payload);



      const result = await adminPost('/admin/students', payload);



      console.log('[handleSubmit] Response:', {

        status: 201,

        data: result,

      });



      setMessage({ text: result.message, type: 'success' });

      clearDraft();

      setSelectedSports([]);

      setFieldErrors({});

      setShowAddStudentModal(false);

      loadData();

    } catch (error) {

      const errorPayload = error.payload || error.data || error.response?.data;

      const validationErrors = errorPayload?.errors || errorPayload?.data?.errors;

      const errorMessage = errorPayload?.message || errorPayload?.data?.message || error.message;



      console.error('[handleSubmit] Error:', {

        message: errorMessage,

        status: error.status,

        payload: errorPayload,

      });



      // Handle structured validation errors from backend

      if (validationErrors) {

        setBackendFieldErrors(validationErrors);

      } else {

        setMessage({

          text: errorMessage || 'Failed to create student. Please try again.',

          type: 'error',

        });

      }

    }

  };



  const handleExit = async (studentId) => {

    const exit_reason = window.prompt('Exit reason (required):');

    if (!exit_reason?.trim()) return;

    const exit_note = window.prompt('Exit note (optional):') || undefined;

    try {

      const result = await adminPost(`/admin/students/${studentId}/exit`, {

        exit_reason: exit_reason.trim(),

        exit_note,

      });

      setMessage({ text: result.message, type: 'success' });

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleRemove = async (studentId) => {

    if (!window.confirm('Archive this student? Record will be soft-deleted.')) {

      return;

    }

    try {

      await adminDelete(`/admin/students/${studentId}`);

      setMessage({ text: 'Student archived successfully.', type: 'success' });

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleMarkActive = async (studentId) => {

    try {

      // Update local state immediately for real-time feedback

      setStudents((prevStudents) =>

        prevStudents.map((s) => (s.student_id === studentId ? { ...s, status: 'ACTIVE' } : s)),

      );

      await adminPut(`/admin/students/${studentId}`, { status: 'ACTIVE' });

      setMessage({ text: 'Student marked as active successfully.', type: 'success' });

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

      loadData(); // Revert on error

    }

  };



  const handleEditStudent = async (student) => {

    const batchIds = student.enrollments?.map(e => e.batch_id).filter(Boolean) || [];

    const firstEnrollment = student.enrollments?.[0] || {};

    

    // Load batches for the student's sport immediately

    let batchesData = [];

    if (firstEnrollment.sport_id) {

      try {

        const result = await adminGet(

          `/admin/batches/available?sport_id=${firstEnrollment.sport_id}`

        );

        batchesData = result.data || [];

        setEditAvailableBatches(batchesData);

      } catch (error) {

        console.error('Failed to load batches for edit:', error);

        setEditAvailableBatches([]);

      }

    } else {

      setEditAvailableBatches([]);

    }



    const sportId = firstEnrollment.sport_id || '';

    const sportName = sports?.find(s => (s.sport_id || s.id) == sportId)?.name || '';

    

    setEditStudentForm({

      student_id: student.student_id,

      name: student.name,

      parent_name: student.parent_name || '',

      parent_email: student.parent_email || '',

      parent_phone: student.parent_phone || '',

      phone: student.phone || '',

      batch_ids: batchIds,

      batch_id: firstEnrollment.batch_id || '',

      duration_plan_id: firstEnrollment.duration_plan_id || '',

      sport_ids: student.enrollments?.map((e) => e.sport_id) || [],

      sport_id: sportId,

      age: student.age || '',

      gender: student.gender || '',

      blood_group: student.blood_group || '',

      height: student.height || '',

      weight: student.weight || '',

      joining_date: student.joining_date

        ? new Date(student.joining_date).toISOString().split('T')[0]

        : '',

      profile_photo: student.profile_photo || null,

    });

    setEditSelectedSports(student.enrollments?.map((e) => e.sport_id) || []);

    setSportSearchQuery(sportName);

    setEditPhotoPreview(student.profile_photo || null);

    

    const batchId = firstEnrollment.batch_id || '';

    const batchName = batchesData.find(b => b.batch_id == batchId)?.name || '';

    setBatchSearchQuery(batchName);

    

    setIsEditingStudent(true);

  };



  const handleEditStudentSubmit = async (e) => {

    e.preventDefault();

    setIsUploadingPhoto(true);

    setMessage({ text: '', type: '' });

    try {

      // Handle profile photo - convert to base64 if file is selected

      let profilePhotoData = undefined;

      if (editStudentForm.profile_photo instanceof File) {

        profilePhotoData = await new Promise((resolve, reject) => {

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);

          reader.onerror = reject;

          reader.readAsDataURL(editStudentForm.profile_photo);

        });

      } else if (editStudentForm.profile_photo === null) {

        // Explicitly set to null to remove photo

        profilePhotoData = null;

      }



      const payload = {

        name: editStudentForm.name,

        parent_name: editStudentForm.parent_name,

        parent_email: editStudentForm.parent_email,

        parent_phone: editStudentForm.parent_phone,

        phone: editStudentForm.phone,

        batch_id: editStudentForm.batch_id ? parseInt(editStudentForm.batch_id) : null,

        sport_ids: editSelectedSports.length > 0 ? editSelectedSports : (editStudentForm.sport_id ? [parseInt(editStudentForm.sport_id)] : []),

        sport_id: editStudentForm.sport_id ? parseInt(editStudentForm.sport_id) : null,

        duration_plan_id: editStudentForm.duration_plan_id

          ? parseInt(editStudentForm.duration_plan_id)

          : null,

        age: editStudentForm.age ? parseInt(editStudentForm.age) : null,

        gender: editStudentForm.gender,

        blood_group: editStudentForm.blood_group,

        height: editStudentForm.height ? parseFloat(editStudentForm.height) : null,

        weight: editStudentForm.weight ? parseFloat(editStudentForm.weight) : null,

        joining_date: editStudentForm.joining_date || null,

        profile_photo: profilePhotoData,

      };



      await adminPut(`/admin/students/${editStudentForm.student_id}`, payload);

      setMessage({ text: 'Student updated successfully.', type: 'success' });

      

      // Update student details if modal is open

      if (selectedStudent && selectedStudent.student_id === editStudentForm.student_id) {

        try {

          const detailsRes = await adminGet(`/admin/students/${editStudentForm.student_id}/details`);

          setStudentDetails(detailsRes.data);

        } catch (error) {

          console.error('Failed to reload student details:', error);

        }

      }

      

      // Update the student in the local list to show new batch immediately

      setStudents(prevStudents => 

        prevStudents.map(student => {

          if (student.student_id === editStudentForm.student_id) {

            const updatedStudent = { ...student };

            // Update batch from the new enrollment data

            if (editStudentForm.batch_id) {

              const batch = editAvailableBatches.find(b => b.batch_id === parseInt(editStudentForm.batch_id));

              if (batch) {

                updatedStudent.batch = batch;

              }

            } else {

              updatedStudent.batch = null;

            }

            return updatedStudent;

          }

          return student;

        })

      );

      

      setIsEditingStudent(false);

      setEditPhotoPreview(null);

      setEditStudentForm(prev => ({ ...prev, profile_photo: null }));

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    } finally {

      setIsUploadingPhoto(false);

    }

  };



  const handleEditPhotoChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;



    // Validate file type

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {

      setMessage({ text: 'Please select a valid image file (JPG, PNG, or WEBP)', type: 'error' });

      return;

    }



    // Validate file size (max 5MB)

    const maxSize = 5 * 1024 * 1024; // 5MB in bytes

    if (file.size > maxSize) {

      setMessage({ text: 'File size must be less than 5MB', type: 'error' });

      return;

    }



    // Create preview

    const reader = new FileReader();

    reader.onload = () => {

      setEditPhotoPreview(reader.result);

      setEditStudentForm(prev => ({ ...prev, profile_photo: file }));

    };

    reader.readAsDataURL(file);

  };



  const handleRemovePhoto = () => {

    setEditPhotoPreview(null);

    setEditStudentForm(prev => ({ ...prev, profile_photo: null }));

    setShowRemovePhotoConfirm(false);

    setMessage({ text: 'Photo removed successfully', type: 'success' });

  };



  const handleDeactivate = async (studentId) => {

    try {

      // Update local state immediately for real-time feedback

      setStudents((prevStudents) =>

        prevStudents.map((s) => (s.student_id === studentId ? { ...s, status: 'INACTIVE' } : s)),

      );

      await adminPut(`/admin/students/${studentId}`, { status: 'INACTIVE' });

      setMessage({ text: 'Student deactivated successfully.', type: 'success' });

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

      loadData(); // Revert on error

    }

  };



  const handleResetCredentials = async (studentId) => {

    // Placeholder for reset credentials functionality

    alert('Reset credentials functionality to be implemented');

  };



  const handlePauseStudent = (student) => {
    setPauseStudent(student);
    setPauseForm({
      pause_start_date: new Date().toISOString().split('T')[0],
      pause_duration: '',
      pause_duration_unit: 'days',
      pause_end_date: '',
      pause_reason: ''
    });
    setShowPauseModal(true);
  };

  const handlePauseSubmit = async (e) => {
    e.preventDefault();
    if (!pauseStudent) return;

    try {
      const payload = {
        pause_start_date: pauseForm.pause_start_date,
        pause_duration: pauseForm.pause_duration,
        pause_duration_unit: pauseForm.pause_duration_unit,
        pause_end_date: pauseForm.pause_end_date,
        pause_reason: pauseForm.pause_reason
      };

      await adminPut(`/admin/students/${pauseStudent.student_id}/pause`, payload);
      setMessage({ text: 'Student plan paused successfully.', type: 'success' });
      setShowPauseModal(false);
      setPauseStudent(null);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const calculateResumeDate = () => {
    if (!pauseForm.pause_start_date) return null;
    
    if (pauseForm.pause_end_date) {
      return new Date(pauseForm.pause_end_date).toLocaleDateString();
    }
    
    if (pauseForm.pause_duration && pauseForm.pause_duration_unit) {
      const startDate = new Date(pauseForm.pause_start_date);
      const duration = parseInt(pauseForm.pause_duration, 10);
      
      switch (pauseForm.pause_duration_unit) {
        case 'days':
          startDate.setDate(startDate.getDate() + duration);
          break;
        case 'weeks':
          startDate.setDate(startDate.getDate() + (duration * 7));
          break;
        case 'months':
          startDate.setMonth(startDate.getMonth() + duration);
          break;
        default:
          return null;
      }
      return startDate.toLocaleDateString();
    }
    
    return null;
  };



  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterSport('');
    setFilterBatch('');
    setFilterCategory('');
    setFilterGender('');
    setFilterWeightClass('');
    setCustomMaxAge('');
    setCustomMaxWeight('');
    setSelectedStudent(null);
  };



  const handleResumeStudent = async (studentId) => {

    try {

      await adminPost(`/admin/students/${studentId}/resume`);

      setMessage({ text: 'Student plan resumed successfully.', type: 'success' });

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleStudentClick = async (student) => {

    setSelectedStudent(student);

    setShowStudentModal(true);

    setModalTab('profile');

    setIsEditingStudent(false);

    setPhotoPreview(null);

    setLoadingDetails(true);

    try {

      const studentId = student.student_id || student.id;

      const detailsRes = await adminGet(`/admin/students/${studentId}/details`);

      setStudentDetails(detailsRes.data);

      // Initialize edit form with student data

      setEditStudentForm({

        name: detailsRes.data.student.name,

        phone: detailsRes.data.student.phone || '',

        dob: detailsRes.data.student.dob

          ? new Date(detailsRes.data.student.dob).toISOString().split('T')[0]

          : '',

        gender: detailsRes.data.student.gender,

        blood_group: detailsRes.data.student.blood_group || '',

        height: detailsRes.data.student.height || '',

        weight: detailsRes.data.student.weight || '',

        parent_name: detailsRes.data.student.parent_name || '',

        parent_email: detailsRes.data.student.parent_email || '',

        parent_phone: detailsRes.data.student.parent_phone || '',

        fees_status: detailsRes.data.student.fees_status || 'unpaid',

        batch_id: detailsRes.data.student.batch_id || '',

      });

      // Initialize selected sports from enrollments

      const activeSportIds =

        (detailsRes?.data?.enrollments || [])

          ?.filter((e) => e?.is_active)

          ?.map((e) => e?.sport_id) || [];

      setEditSelectedSports(activeSportIds);

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    } finally {

      setLoadingDetails(false);

    }

  };



  const handleUpdateStudent = async (event) => {

    event.preventDefault();

    setMessage({ text: '', type: '' });

    try {

      // Handle profile photo - convert to base64 if file is selected

      let profilePhotoData = undefined;

      if (editStudentForm.profile_photo instanceof File) {

        profilePhotoData = await new Promise((resolve, reject) => {

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);

          reader.onerror = reject;

          reader.readAsDataURL(editStudentForm.profile_photo);

        });

      } else if (editStudentForm.profile_photo === null) {

        // Explicitly set to null to remove photo

        profilePhotoData = null;

      }



      const result = await adminPut(`/admin/students/${selectedStudent.student_id}`, {

        name: editStudentForm.name,

        phone: editStudentForm.phone,

        dob: editStudentForm.dob,

        age: calculateAgeFromDOB(editStudentForm.dob),

        gender: editStudentForm.gender,

        blood_group: editStudentForm.blood_group,

        height: editStudentForm.height ? parseFloat(editStudentForm.height) : null,

        weight: editStudentForm.weight ? parseFloat(editStudentForm.weight) : null,

        parent_name: editStudentForm.parent_name,

        parent_email: editStudentForm.parent_email,

        parent_phone: editStudentForm.parent_phone,

        fees_status: editStudentForm.fees_status,

        profile_photo: profilePhotoData,

        sport_ids: editSelectedSports,

        duration_plan_id: editStudentForm.duration_plan_id

          ? parseInt(editStudentForm.duration_plan_id, 10)

          : undefined,

        batch_id: editStudentForm.batch_id ? parseInt(editStudentForm.batch_id, 10) : undefined,

      });

      setMessage({ text: result.message || 'Student updated successfully', type: 'success' });

      setIsEditingStudent(false);

      setPhotoPreview(null);

      // Reload student details

      const detailsRes = await adminGet(`/admin/students/${selectedStudent.student_id}/details`);

      setStudentDetails(detailsRes.data);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const downloadSampleCSV = () => {

    const headers = 'first_name,last_name,phone,parent_name,parent_email,gender,age\n';

    const sampleRow = 'John,Doe,1234567890,Robert Doe,robert@example.com,male,14\n';

    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.setAttribute('href', url);

    link.setAttribute('download', 'student_import_template.csv');

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const handleBulkUpload = async (event) => {

    event.preventDefault();

    if (!bulkUploadFile) {

      setMessage({ text: 'Please select a CSV file', type: 'error' });

      return;

    }



    const reader = new FileReader();

    reader.onload = async (e) => {

      try {

        const text = e.target.result;

        const lines = text.split('\n').filter((line) => line.trim());

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());



        const students = [];

        for (let i = 1; i < lines.length; i++) {

          const values = lines[i].split(',').map((v) => v.trim());

          const student = {};

          headers.forEach((header, index) => {

            student[header] = values[index] || '';

          });

          if (student.first_name || student.name) {

            students.push(student);

          }

        }



        const result = await adminPost('/admin/students/bulk-upload', { students });

        setBulkUploadResults(result);

        setMessage({

          text: `Bulk upload completed: ${result.success_count} created, ${result.error_count} errors`,

          type: result.error_count > 0 ? 'warning' : 'success',

        });

        loadData();

        setShowBulkUpload(false);

        setBulkUploadFile(null);

        setBulkUploadResults(null);

      } catch (error) {

        setMessage({ text: error.message, type: 'error' });

      }

    };

    reader.readAsText(bulkUploadFile);

  };



  const toggleBulkEditMode = () => {

    setIsBulkEditMode((prev) => !prev);

    setSelectedIds([]);

  };



  const handleRowClick = (studentId) => {

    if (!isBulkEditMode) return;

    setSelectedIds((prev) => {

      if (prev.includes(studentId)) {

        return prev.filter((id) => id !== studentId);

      } else {

        return [...prev, studentId];

      }

    });

  };



  const handleSelectAll = (checked) => {

    if (checked) {

      setSelectedIds(filteredStudents.map((s) => s.student_id));

    } else {

      setSelectedIds([]);

    }

  };



  const handleSelectOne = (studentId, checked) => {

    if (checked) {

      setSelectedIds((prev) => [...prev, studentId]);

    } else {

      setSelectedIds((prev) => prev.filter((id) => id !== studentId));

    }

  };



  const handleBulkDelete = async () => {

    if (selectedIds.length === 0) return;

    if (

      !window.confirm(

        `Warning: Permanently removing ${selectedIds.length} students will delete them from the academy. Proceed?`,

      )

    ) {

      return;

    }

    setMessage({ text: '', type: '' });

    try {

      await adminPost('/admin/students/bulk-action', {

        action: 'delete',

        student_ids: selectedIds,

      });

      setMessage({ text: 'Students removed successfully', type: 'success' });

      setSelectedIds([]);

      setIsBulkEditMode(false);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleBulkActivate = async () => {

    if (selectedIds.length === 0) return;

    setMessage({ text: '', type: '' });

    try {

      await adminPost('/admin/students/bulk-action', {

        action: 'activate',

        student_ids: selectedIds,

      });

      setMessage({ text: 'Students activated successfully', type: 'success' });

      setSelectedIds([]);

      setIsBulkEditMode(false);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleBulkDeactivate = async () => {

    if (selectedIds.length === 0) return;

    setMessage({ text: '', type: '' });

    try {

      await adminPost('/admin/students/bulk-action', {

        action: 'deactivate',

        student_ids: selectedIds,

      });

      setMessage({ text: 'Students deactivated successfully', type: 'success' });

      setSelectedIds([]);

      setIsBulkEditMode(false);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleBulkPause = async () => {

    if (selectedIds.length === 0) return;

    const pauseReason = prompt('Enter pause reason (optional):');

    setMessage({ text: '', type: '' });

    try {

      await adminPost('/admin/students/bulk-action', {

        action: 'pause',

        student_ids: selectedIds,

        pause_reason: pauseReason || '',

      });

      setMessage({ text: 'Students paused successfully', type: 'success' });

      setSelectedIds([]);

      setIsBulkEditMode(false);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };



  const handleBulkResume = async () => {

    if (selectedIds.length === 0) return;

    setMessage({ text: '', type: '' });

    try {

      await adminPost('/admin/students/bulk-action', {

        action: 'resume',

        student_ids: selectedIds,

      });

      setMessage({ text: 'Students resumed successfully', type: 'success' });

      setSelectedIds([]);

      setIsBulkEditMode(false);

      loadData();

    } catch (error) {

      setMessage({ text: error.message, type: 'error' });

    }

  };




  const filteredStudents = (students || []).filter((student) => {

    const matchesSearch =

      !searchQuery ||

      (student.name && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||

      (student.first_name &&

        student.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||

      (student.last_name && student.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||

      (student.parent_email &&

        student.parent_email.toLowerCase().includes(searchQuery.toLowerCase())) ||

      (student.phone && student.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||

      (student.parent_phone &&

        student.parent_phone.toLowerCase().includes(searchQuery.toLowerCase()));



    const matchesSport =

      !filterSport ||

      student.sport_id === parseInt(filterSport) ||

      (student.enrollments &&

        Array.isArray(student.enrollments) &&

        student.enrollments.some((e) => e.sport_id === parseInt(filterSport)));



    const matchesBatch = !filterBatch || student.batch_id === parseInt(filterBatch);



    let matchesCategory = true;

    if (filterCategory) {

      if (filterCategory === 'U25') {

        matchesCategory = student.age <= 25;

      } else if (filterCategory === 'U40') {

        matchesCategory = student.age <= 40;

      } else if (filterCategory === 'Custom') {

        matchesCategory = !customMaxAge || student.age <= parseFloat(customMaxAge);

      } else {

        matchesCategory = student.category === filterCategory;

      }

    }



    const matchesGender =

      !filterGender ||

      (student.gender && student.gender.toLowerCase() === filterGender.toLowerCase());



    let matchesWeight = true;

    if (filterWeightClass) {

      const weight = parseFloat(student.weight);

      if (isNaN(weight)) {

        matchesWeight = false; // or true if we want to include students without weight

      } else if (filterWeightClass === 'Under 50kg') {

        matchesWeight = weight < 50;

      } else if (filterWeightClass === '50-70kg') {

        matchesWeight = weight >= 50 && weight <= 70;

      } else if (filterWeightClass === '70-90kg') {

        matchesWeight = weight > 70 && weight <= 90;

      } else if (filterWeightClass === 'Above 90kg') {

        matchesWeight = weight > 90;

      } else if (filterWeightClass === 'Custom') {

        matchesWeight = !customMaxWeight || weight <= parseFloat(customMaxWeight);

      }

    }



    return (

      matchesSearch &&

      matchesSport &&

      matchesBatch &&

      matchesCategory &&

      matchesGender &&

      matchesWeight

    );

  });



  return (

    <motion.div

      className="w-full space-y-6 overflow-x-hidden p-6"

      initial={{ opacity: 0, y: 20 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.4 }}

    >

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold">Students</h2>

          <p className="text-muted">

            Manage student enrollments, sports, batches, and fee records.

          </p>

        </div>

        <div className="flex gap-2">

          <motion.button

            type="button"

            className="btn-primary"

            onClick={() => setShowAddStudentModal(true)}

            whileHover={{ scale: 1.02 }}

            whileTap={{ scale: 0.98 }}

          >

            + Add Student

          </motion.button>

          <motion.button

            type="button"

            className="btn-secondary"

            onClick={() => setShowBulkUpload(true)}

            whileHover={{ scale: 1.02 }}

            whileTap={{ scale: 0.98 }}

          >

            Bulk Import (CSV)

          </motion.button>

        </div>

      </div>



      {/* Filter Section */}

      <div className="card mb-6">

        <div className="flex flex-wrap items-center gap-4">

          <div className="w-full min-w-0 flex-1 sm:w-auto">

            <input

              type="text"

              placeholder="Search students..."

              className="input-field w-full"

              value={searchQuery}

              onChange={(e) => {

                setSearchQuery(e.target.value);

                setSelectedStudent(null);

              }}

            />

          </div>

          <motion.button

            type="button"

            onClick={() => setShowFilterPanel(!showFilterPanel)}

            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showFilterPanel 
                ? 'bg-primary text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}

            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >

            <Filter className="w-4 h-4" />

            Filters

          </motion.button>

        </div>



        <AnimatePresence>

          {showFilterPanel && (

            <motion.div

              initial={{ height: 0, opacity: 0 }}

              animate={{ height: 'auto', opacity: 1 }}

              exit={{ height: 0, opacity: 0 }}

              transition={{ duration: 0.3, ease: 'easeInOut' }}

              className="overflow-hidden"

            >

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-slate-200 mt-4">

            <select

              className="input-field w-full"

              value={filterSport}

              onChange={(e) => {

                setFilterSport(e.target.value);

                setFilterBatch(''); // Reset batch when sport changes

                setSelectedStudent(null);

              }}

            >

              <option value="">All Sports</option>

              {(sports || []).map((s) => (

                <option key={s.sport_id} value={s.sport_id}>

                  {s.name}

                </option>

              ))}

            </select>

            <select

              className="input-field w-full"

              value={filterBatch}

              disabled={!filterSport}

              onChange={(e) => {

                setFilterBatch(e.target.value);

                setSelectedStudent(null);

              }}

            >

              <option value="">All Batches</option>

              {(availableBatches || []).map((b) => (

                <option key={b.batch_id} value={b.batch_id}>

                  {b.name}

                </option>

              ))}

            </select>

            <select

              className="input-field w-full"

              value={filterCategory}

              onChange={(e) => {

                setFilterCategory(e.target.value);

                setSelectedStudent(null);

                if (e.target.value !== 'Custom') {

                  setCustomMaxAge('');

                }

              }}

            >

              <option value="">All Categories</option>

              <option value="U8">U8 (5-8 years)</option>

              <option value="U10">U10 (9-10 years)</option>

              <option value="U12">U12 (11-12 years)</option>

              <option value="U14">U14 (13-14 years)</option>

              <option value="U16">U16 (15-16 years)</option>

              <option value="U18">U18 (17-18 years)</option>

              <option value="Senior">Senior (18+ years)</option>

              <option value="U25">U25 (Under 25 years)</option>

              <option value="U40">U40 (Under 40 years)</option>

              <option value="Custom">Custom Under Age...</option>

            </select>

            {filterCategory === 'Custom' && (

              <input

                type="number"

                min="0"

                placeholder="Enter max age..."

                className="input-field w-32"

                value={customMaxAge}

                onChange={(e) => setCustomMaxAge(e.target.value)}

              />

            )}

            <select

              className="input-field w-full"

              value={filterGender}

              onChange={(e) => {

                setFilterGender(e.target.value);

                setSelectedStudent(null);

              }}

            >

              <option value="">All Genders</option>

              <option value="Male">Male</option>

              <option value="Female">Female</option>

              <option value="Other">Other</option>

            </select>

            <select

              className="input-field w-full"

              value={filterWeightClass}

              onChange={(e) => {

                setFilterWeightClass(e.target.value);

                setSelectedStudent(null);

                if (e.target.value !== 'Custom') {

                  setCustomMaxWeight('');

                }

              }}

            >

              <option value="">All Weights</option>

              <option value="Under 50kg">Under 50kg</option>

              <option value="50-70kg">50-70kg</option>

              <option value="70-90kg">70-90kg</option>

              <option value="Above 90kg">Above 90kg</option>

              <option value="Custom">Custom Under Weight...</option>

            </select>

            {filterWeightClass === 'Custom' && (

              <input

                type="number"

                min="0"

                placeholder="Enter max kg..."

                className="input-field w-32"

                value={customMaxWeight}

                onChange={(e) => setCustomMaxWeight(e.target.value)}

              />

            )}

            <button

              type="button"

              onClick={handleClearFilters}

              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"

            >

              <X className="w-4 h-4" />

              Clear Filters

            </button>

            </div>

            </motion.div>

          )}

        </AnimatePresence>

      </div>



      {/* Active Students Table - Full Page Width */}

      <div className="card overflow-x-auto">

        {selectedStudent ? (

          <div className="card">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="font-bold">Student Profile</h3>

              <button

                type="button"

                className="btn-secondary btn-sm"

                onClick={() => {

                  setSelectedStudent(null);

                  setStudentDetails(null);

                }}

              >

                Close

              </button>

            </div>

            {loadingDetails ? (

              <Loader />

            ) : studentDetails ? (

              <div className="space-y-4">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="text-muted text-sm font-semibold">Student ID</label>

                    <p>

                      {studentDetails?.student?.student_id || selectedStudent?.student_id || '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Full Name</label>

                    <p className="text-lg">

                      {[

                        studentDetails?.student?.first_name,

                        studentDetails?.student?.middle_name,

                        studentDetails?.student?.last_name,

                      ]

                        .filter(Boolean)

                        .join(' ') ||

                        studentDetails?.student?.name ||

                        selectedStudent?.name ||

                        '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Email</label>

                    <p>

                      {studentDetails?.student?.parent_email ||

                        selectedStudent?.parent_email ||

                        '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Phone</label>

                    <p>{studentDetails?.student?.phone || selectedStudent?.phone || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Date of Birth</label>

                    <p>

                      {studentDetails?.student?.dob

                        ? new Date(studentDetails.student.dob).toLocaleDateString()

                        : selectedStudent?.dob

                          ? new Date(selectedStudent.dob).toLocaleDateString()

                          : '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Age</label>

                    <p>{studentDetails?.student?.age || selectedStudent?.age || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Category</label>

                    <p>

                      {studentDetails?.student?.category || selectedStudent?.category ? (

                        <span

                          className={`rounded px-2 py-0.5 text-xs ${

                            (studentDetails?.student?.category || selectedStudent?.category) ===

                            'U8'

                              ? 'bg-blue-100 text-blue-800'

                              : (studentDetails?.student?.category || selectedStudent?.category) ===

                                  'U10'

                                ? 'bg-green-100 text-green-800'

                                : (studentDetails?.student?.category ||

                                      selectedStudent?.category) === 'U12'

                                  ? 'bg-yellow-100 text-yellow-800'

                                  : (studentDetails?.student?.category ||

                                        selectedStudent?.category) === 'U14'

                                    ? 'bg-orange-100 text-orange-800'

                                    : (studentDetails?.student?.category ||

                                          selectedStudent?.category) === 'U16'

                                      ? 'bg-red-100 text-red-800'

                                      : (studentDetails?.student?.category ||

                                            selectedStudent?.category) === 'U18'

                                        ? 'bg-purple-100 text-purple-800'

                                        : 'bg-gray-100 text-gray-800'

                          }`}

                        >

                          {studentDetails?.student?.category || selectedStudent?.category}

                        </span>

                      ) : (

                        '—'

                      )}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Gender</label>

                    <p>

                      {normalizeGender(studentDetails?.student?.gender || selectedStudent?.gender)}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Blood Group</label>

                    <p>{studentDetails?.student?.blood_group || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Height</label>

                    <p>

                      {studentDetails?.student?.height

                        ? `${studentDetails.student.height} cm`

                        : '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Weight</label>

                    <p>

                      {studentDetails?.student?.weight

                        ? `${studentDetails.student.weight} kg`

                        : '—'}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Joining Date</label>

                    <p>

                      {(() => {

                        try {

                          const date =

                            studentDetails?.student?.joining_date || selectedStudent?.joining_date;

                          return date ? new Date(date).toLocaleDateString() : '—';

                        } catch (e) {

                          return '—';

                        }

                      })()}

                    </p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Parent Name</label>

                    <p>{studentDetails?.student?.parent_name || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Parent Email</label>

                    <p>{studentDetails?.student?.parent_email || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Parent Phone</label>

                    <p>{studentDetails?.student?.parent_phone || '—'}</p>

                  </div>

                  <div>

                    <label className="text-muted text-sm font-semibold">Fee Status</label>

                    <p>

                      {studentDetails?.student?.fees_status || selectedStudent?.fees_status || '—'}

                    </p>

                  </div>

                </div>

                {studentDetails?.enrollments &&

                Array.isArray(studentDetails.enrollments) &&

                studentDetails.enrollments.length > 0 ? (

                  <div className="mt-4">

                    <h4 className="mb-2 font-semibold">Enrollments</h4>

                    <div className="space-y-2">

                      {studentDetails.enrollments.map((enrollment, idx) => {

                        const enrollmentId = enrollment?.enrollment_id || enrollment?.id || idx;

                        const sportName =

                          typeof enrollment?.sport === 'string'

                            ? enrollment.sport

                            : enrollment?.sport?.name || enrollment?.sport || 'Unassigned';

                        const batchName =

                          typeof enrollment?.batch === 'string'

                            ? enrollment.batch

                            : enrollment?.batch?.name || enrollment?.batch || 'N/A';

                        const planName =

                          enrollment?.duration_plan?.name ||

                          enrollment?.durationPlan?.name ||

                          'No plan';



                        return (

                          <div key={enrollmentId} className="bg-muted rounded p-3">

                            <div className="flex items-center justify-between">

                              <span className="font-semibold">{sportName}</span>

                              <span className="text-muted text-sm">{batchName}</span>

                            </div>

                            <div className="mt-2 text-sm">

                              <p>Duration Plan: {planName}</p>

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  </div>

                ) : (

                  <div className="mt-4">

                    <h4 className="mb-2 font-semibold">Enrollments</h4>

                    <p className="text-muted">No enrollment data available</p>

                  </div>

                )}

                <div className="bg-accent/10 border-accent/20 mt-4 rounded-lg border p-4">

                  <h4 className="text-accent mb-3 font-bold">Financial Accounts Matrix</h4>

                  {studentDetails?.enrollments &&

                  Array.isArray(studentDetails.enrollments) &&

                  studentDetails.enrollments.length > 0 ? (

                    <>

                      {/* Combined Financial Summary */}

                      <div className="bg-accent/20 border-accent/30 mb-4 rounded-lg border p-3">

                        <h5 className="text-accent mb-2 font-semibold">

                          Combined Financial Summary

                        </h5>

                        <div className="grid grid-cols-2 gap-2 text-sm">

                          <div className="flex justify-between">

                            <span>Total Registration Fee:</span>

                            <span className="font-semibold">

                              ₹

                              {formatCurrency(

                                studentDetails.enrollments.reduce((sum, e) => {

                                  const feeBreakdown = calculateStudentFee(e);

                                  return sum + feeBreakdown.registrationFee;

                                }, 0),

                              )}

                            </span>

                          </div>

                          <div className="flex justify-between">

                            <span>Total Sports Fee:</span>

                            <span className="font-semibold">

                              ₹

                              {formatCurrency(

                                studentDetails.enrollments.reduce((sum, e) => {

                                  const feeBreakdown = calculateStudentFee(e);

                                  return sum + feeBreakdown.sportsFee;

                                }, 0),

                              )}

                            </span>

                          </div>

                          <div className="flex justify-between">

                            <span>Total Additional Charges:</span>

                            <span className="font-semibold">

                              ₹

                              {formatCurrency(

                                studentDetails.enrollments.reduce((sum, e) => {

                                  const feeBreakdown = calculateStudentFee(e);

                                  return sum + feeBreakdown.additionalCharges;

                                }, 0),

                              )}

                            </span>

                          </div>

                          <div className="flex justify-between">

                            <span>Total Discount:</span>

                            <span className="text-danger font-semibold">

                              -₹

                              {formatCurrency(

                                studentDetails.enrollments.reduce((sum, e) => {

                                  const feeBreakdown = calculateStudentFee(e);

                                  return sum + feeBreakdown.discount;

                                }, 0),

                              )}

                            </span>

                          </div>

                          <div className="border-accent/30 col-span-2 mt-2 flex justify-between border-t pt-2">

                            <span className="text-accent font-bold">Grand Total Due:</span>

                            <span className="text-success text-lg font-bold">

                              ₹

                              {formatCurrency(

                                studentDetails.enrollments.reduce((sum, e) => {

                                  const feeBreakdown = calculateStudentFee(e);

                                  return sum + feeBreakdown.totalComputedFee;

                                }, 0),

                              )}

                            </span>

                          </div>

                        </div>

                      </div>



                      {/* Sport-wise Breakdown */}

                      <div className="space-y-2 text-sm">

                        <h5 className="text-muted text-xs font-semibold uppercase tracking-wider">

                          Sport-wise Breakdown

                        </h5>

                        {studentDetails.enrollments.map((enrollment, idx) => {

                          const enrollmentId = enrollment?.enrollment_id || enrollment?.id || idx;

                          // Use the centralized fee calculation utility

                          const feeBreakdown = calculateStudentFee(enrollment);

                          const sportName =

                            typeof enrollment?.sport === 'string'

                              ? enrollment.sport

                              : enrollment?.sport?.name || enrollment?.sport || 'Unassigned';



                          return (

                            <div key={enrollmentId} className="border-b pb-2 last:border-0">

                              <p className="font-semibold">{sportName}</p>

                              <div className="mt-1 grid grid-cols-2 gap-2">

                                <span>Base Fee: ₹{formatCurrency(feeBreakdown.sportsBaseFee)}</span>

                                <span>Sports Fee: ₹{formatCurrency(feeBreakdown.sportsFee)}</span>

                                <span>Registration: ₹{formatCurrency(feeBreakdown.registrationFee)}</span>

                                <span>Additional: ₹{formatCurrency(feeBreakdown.additionalCharges)}</span>

                                <span>Discount: -₹{formatCurrency(feeBreakdown.discount)}</span>

                                <span className="text-success col-span-2 font-bold">

                                  Net Due: ₹{formatCurrency(feeBreakdown.totalComputedFee)}

                                </span>

                              </div>

                            </div>

                          );

                        })}

                      </div>

                    </>

                  ) : (

                    <p className="text-muted">No enrollment data available</p>

                  )}

                </div>

                <div className="bg-muted/10 border-muted/20 mt-4 rounded-lg border p-4">

                  <h4 className="mb-3 font-bold">Attendance Summary</h4>

                  <p className="text-muted">Attendance data not available in current view</p>

                </div>

                <div className="bg-muted/10 border-muted/20 mt-4 rounded-lg border p-4">

                  <h4 className="mb-3 font-bold">Payment History</h4>

                  <p className="text-muted">Payment history not available in current view</p>

                </div>

              </div>

            ) : (

              <p className="text-muted">No student details available</p>

            )}

          </div>

        ) : (

          <div>

            <div className="mb-4 flex items-center justify-between">

              <h3 className="font-bold">Active Students</h3>

              <div className="flex items-center gap-3">

                <button

                  type="button"

                  className={`btn-sm ${isBulkEditMode ? 'btn-primary' : 'btn-secondary'}`}

                  onClick={toggleBulkEditMode}

                >

                  {isBulkEditMode ? 'Exit Bulk Mode' : 'Bulk Actions'}

                </button>

              </div>

            </div>

            {isBulkEditMode && selectedIds.length > 0 && (

              <motion.div

                initial={{ opacity: 0, y: -10 }}

                animate={{ opacity: 1, y: 0 }}

                className="mb-4 flex gap-2"

              >

                <button type="button" className="btn-secondary btn-sm" onClick={handleBulkActivate}>

                  Bulk Activate ({selectedIds.length})

                </button>

                <button

                  type="button"

                  className="btn-secondary btn-sm"

                  onClick={handleBulkDeactivate}

                >

                  Bulk Deactivate ({selectedIds.length})

                </button>

                <button type="button" className="btn-danger btn-sm" onClick={handleBulkDelete}>

                  Bulk Delete ({selectedIds.length})

                </button>

                <button type="button" className="btn-secondary btn-sm" onClick={handleBulkPause}>

                  Bulk Pause ({selectedIds.length})

                </button>

                <button type="button" className="btn-secondary btn-sm" onClick={handleBulkResume}>

                  Bulk Resume ({selectedIds.length})

                </button>

              </motion.div>

            )}

            {loading ? (

              <Loader />

            ) : (

              <table className="w-full border-collapse text-left text-sm">

                <thead>

                  <tr className="border-border text-muted border-b text-xs font-bold uppercase tracking-wider">

                    {isBulkEditMode && (

                      <th className="w-10 pb-3">

                        <input

                          type="checkbox"

                          checked={

                            selectedIds.length === filteredStudents.length &&

                            filteredStudents.length > 0

                          }

                          onChange={(e) => handleSelectAll(e.target.checked)}

                          className="border-border accent-accent h-4 w-4 rounded"

                        />

                      </th>

                    )}

                    <th className="pb-3">Name</th>

                    <th className="px-2 pb-3">Age</th>

                    <th className="px-2 pb-3">Sports</th>

                    <th className="px-2 pb-3">Batch</th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">

                      Status

                    </th>

                    <th className="px-2 pb-3">Actions</th>

                  </tr>

                </thead>

                <tbody className="divide-border divide-y">

                  {filteredStudents.length === 0 ? (

                    <tr>

                      <td

                        colSpan={isBulkEditMode ? 7 : 6}

                        className="text-muted py-8 text-center text-xs"

                      >

                        No active students found.

                      </td>

                    </tr>

                  ) : (

                    filteredStudents.map((student, index) => {

                      const isInactive = student.status?.toUpperCase() !== 'ACTIVE' && !student.isActive;



                      return (

                        <motion.tr

                          key={student.student_id}

                          initial={{ opacity: 0, y: 10 }}

                          animate={{ opacity: 1, y: 0 }}

                          transition={{ duration: 0.3, delay: index * 0.05 }}

                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}

                          className={`text-foreground cursor-pointer ${

                            selectedIds.includes(student.student_id) ? 'bg-surface-secondary/50' : ''

                          } ${isInactive ? 'opacity-60 bg-gray-50' : ''}`}

                          onClick={() => handleRowClick(student.student_id)}

                        >

                          {isBulkEditMode && (

                            <td onClick={(e) => e.stopPropagation()}>

                              <input

                                type="checkbox"

                                checked={selectedIds.includes(student.student_id)}

                                onChange={(e) =>

                                  handleSelectOne(student.student_id, e.target.checked)

                                }

                                className="border-border accent-accent h-4 w-4 rounded"

                              />

                            </td>

                          )}

                          <td>

                            <div className="flex items-center gap-3">

                              <Avatar src={student.profile_photo} name={student.name} size="sm" />

                              <div>

                                <p className="font-semibold">{student.name}</p>

                                {student.parent_email && (

                                  <p className="text-muted text-xs">{student.parent_email}</p>

                                )}

                              </div>

                            </div>

                          </td>

                          <td className="text-muted">{student.age || '—'}</td>

                          <td>

                            {student.enrollments &&

                            Array.isArray(student.enrollments) &&

                            student.enrollments.length > 0 ? (

                              <div className="flex flex-wrap gap-1">

                                {(student.enrollments || []).map((enrollment) => (

                                  <span

                                    key={enrollment?.enrollment_id || enrollment?.id}

                                    className="bg-success/10 text-success border-success/20 rounded border px-2 py-0.5 text-xs"

                                  >

                                    {enrollment?.sport?.name || enrollment?.sport || '—'}

                                  </span>

                                ))}

                              </div>

                            ) : (

                              <span>{student?.sport?.name || student?.sport || '—'}</span>

                            )}

                          </td>

                          <td className="text-muted">

                            {student.batch?.name || student.enrollments?.[0]?.batch?.name || '—'}

                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">

                            {student.status?.toUpperCase() === 'ACTIVE' || student.isActive ? (

                              <span className="badge-active">ACTIVE</span>

                            ) : (

                              <span className="badge-inactive">INACTIVE</span>

                            )}

                          </td>

                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>

                            <div className="flex items-center gap-2">

                              {/* View Profile - Eye Icon */}

                              <button

                                type="button"

                                className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"

                                onClick={() => handleStudentClick(student)}

                                title="View Profile"

                              >

                                <Eye className="w-4 h-4" />

                              </button>



                              {/* Edit - Edit Icon */}

                              <button

                                type="button"

                                className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"

                                onClick={() => handleEditStudent(student)}

                                title="Edit Student"

                              >

                                <Edit className="w-4 h-4" />

                              </button>



                              {/* Status Toggle - Lock/Unlock Icon */}

                              {student.status?.toUpperCase() === 'ACTIVE' || student.isActive ? (

                                <button

                                  type="button"

                                  className="p-2 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"

                                  onClick={() => handleDeactivate(student.student_id)}

                                  title="Deactivate Student"

                                >

                                  <Lock className="w-4 h-4" />

                                </button>

                              ) : (

                                <button

                                  type="button"

                                  className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"

                                  onClick={() => handleMarkActive(student.student_id)}

                                  title="Activate Student"

                                >

                                  <Unlock className="w-4 h-4" />

                                </button>

                              )}



                              {/* Pause/Resume Plan - Pause/Play Icon */}

                              {student.enrollments?.some(e => e.is_paused) ? (

                                <button

                                  type="button"

                                  className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"

                                  onClick={() => handleResumeStudent(student.student_id)}

                                  title="Resume Student Plan"

                                >

                                  <Play className="w-4 h-4" />

                                </button>

                              ) : (

                                <button

                                  type="button"

                                  className="p-2 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"

                                  onClick={() => handlePauseStudent(student)}

                                  title="Pause Student Plan"

                                >

                                  <Pause className="w-4 h-4" />

                                </button>

                              )}



                              {/* Reset Credentials - Key Icon */}

                              <button

                                type="button"

                                className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"

                                onClick={() => handleResetCredentials(student.student_id)}

                                title="Reset Password"

                              >

                                <Key className="w-4 h-4" />

                              </button>



                              {/* Remove - Trash Icon */}

                              <button

                                type="button"

                                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"

                                onClick={() => handleRemove(student.student_id)}

                                title="Delete Student"

                              >

                                <Trash2 className="w-4 h-4" />

                              </button>

                            </div>

                          </td>

                        </motion.tr>

                      );

                    })

                  )}

                </tbody>

              </table>

            )}

          </div>

        )}

      </div>



      {message.text && (

        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>

          {message.text}

        </p>

      )}



 {/* Add Student Modal */}

{showAddStudentModal && (

  <motion.div 

    initial={{ opacity: 0 }}

    animate={{ opacity: 1 }}

    exit={{ opacity: 0 }}

    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md"

  >

    <div className="card animate-premiumModal max-h-[90vh] w-full max-w-4xl overflow-y-auto">

      <div className="mb-4 flex items-center justify-between">

        <h3 className="font-bold">Add New Student</h3>

        <div className="flex gap-2">

          {draftSavedAt && <span className="text-muted text-xs">Draft saved</span>}

          <button

            type="button"

            className="text-muted hover:text-foreground"

            onClick={() => {

              setShowAddStudentModal(false);

              setSelectedSports([]);

              setSportSearchQuery('');

            }}

          >

            ✕

          </button>

        </div>

      </div>

      

      <form onSubmit={handleSubmit}>

        {/* Name Fields */}

        <div className="grid gap-4 md:grid-cols-3">

          <div>

            <label className="label" htmlFor="firstName">

              First Name

            </label>

            <input

              id="firstName"

              type="text"

              className={`input-field ${fieldErrors.firstName ? 'border-red-500' : ''}`}

              value={form.firstName}

              onChange={(e) => {

                setForm({ ...form, firstName: e.target.value });

                clearFieldError('firstName');

              }}

              onBlur={() => validateField('firstName', form.firstName)}

              required

            />

            {fieldErrors.firstName && (

              <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>

            )}

          </div>

          <div>

            <label className="label" htmlFor="middleName">

              Middle Name (Optional)

            </label>

            <input

              id="middleName"

              type="text"

              className="input-field"

              value={form.middleName}

              onChange={(e) => setForm({ ...form, middleName: e.target.value })}

            />

          </div>

          <div>

            <label className="label" htmlFor="lastName">

              Last Name

            </label>

            <input

              id="lastName"

              type="text"

              className={`input-field ${fieldErrors.lastName ? 'border-red-500' : ''}`}

              value={form.lastName}

              onChange={(e) => {

                setForm({ ...form, lastName: e.target.value });

                clearFieldError('lastName');

              }}

              onBlur={() => validateField('lastName', form.lastName)}

              required

            />

            {fieldErrors.lastName && (

              <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>

            )}

          </div>

        </div>



        {/* Profile Photo */}

        <div className="mb-4 mt-4">

          <label className="label" htmlFor="profilePhoto">

            Profile Photo (Optional)

          </label>

          <input

            id="profilePhoto"

            name="profile_photo"

            type="file"

            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"

            className="input-field"

            onChange={(e) => {

              const file = e.target.files[0];

              if (file) {

                const allowedTypes = [

                  'image/jpeg',

                  'image/jpg',

                  'image/png',

                  'image/gif',

                  'image/webp',

                ];

                if (!allowedTypes.includes(file.type)) {

                  setFieldError(

                    'profile_photo',

                    'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',

                  );

                  e.target.value = '';

                  return;

                }

                if (file.size > 5 * 1024 * 1024) {

                  alert('File size exceeds the 5MB limit. Please choose a smaller file.');

                  e.target.value = '';

                  return;

                }

                clearFieldError('profile_photo');

                setForm({ ...form, profile_photo: file });

              }

            }}

          />

          <p className="text-muted mt-1 text-xs">Accepts JPEG, PNG, GIF, WebP (max 5MB)</p>

          {fieldErrors.profile_photo && (

            <p className="mt-1 text-xs text-red-500">{fieldErrors.profile_photo}</p>

          )}

        </div>



        {/* DOB & Age */}

        <div className="grid gap-4 sm:grid-cols-2">

          <div>

            <label className="label" htmlFor="studentDob">

              Date of Birth

            </label>

            <input

              id="studentDob"

              name="dob"

              type="date"

              className={`input-field ${fieldErrors.dob ? 'border-red-500' : ''}`}

              value={form.dob}

              onChange={(e) => {

                const dob = e.target.value;

                setForm({ ...form, dob });

                clearFieldError('dob');

              }}

              onBlur={() => validateField('dob', form.dob)}

              required

              max={new Date().toISOString().split('T')[0]}

            />

            {fieldErrors.dob && (

              <p className="mt-1 text-xs text-red-500">{fieldErrors.dob}</p>

            )}

            <p className="text-muted mt-1 text-xs">Age will be calculated automatically</p>

          </div>

          <div>

            <label className="label" htmlFor="calculatedAge">

              Age (Calculated)

            </label>

            <input

              id="calculatedAge"

              type="text"

              className="input-field bg-muted"

              value={form.dob ? `${calculateAgeFromDOB(form.dob)} years` : ''}

              readOnly

              disabled

            />

            <p className="text-muted mt-1 text-xs">Auto-calculated from DOB</p>

          </div>

        </div>



        {/* Gender, Height, Weight */}

        <div className="grid gap-4 sm:grid-cols-3 mt-4">

          <div>

            <label className="label" htmlFor="studentGender">

              Gender

            </label>

            <select

              id="studentGender"

              name="gender"

              className="input-field"

              value={form.gender}

              onChange={updateField}

              required

            >

              <option value="Male">Male</option>

              <option value="Female">Female</option>

              <option value="Other">Other</option>

            </select>

          </div>

          <div>

            <label className="label" htmlFor="studentHeight">

              HEIGHT (cm)

            </label>

            <input

              id="studentHeight"

              name="height"

              type="number"

              step="0.1"

              min="0"

              className="input-field"

              value={form.height}

              onChange={updateField}

              placeholder="Optional"

            />

          </div>

          <div>

            <label className="label" htmlFor="studentWeight">

              WEIGHT (kg)

            </label>

            <input

              id="studentWeight"

              name="weight"

              type="number"

              step="0.1"

              min="0"

              className="input-field"

              value={form.weight}

              onChange={updateField}

              placeholder="Optional"

            />

          </div>

        </div>



        {/* Phone & Joining Date */}

        <div className="grid gap-4 sm:grid-cols-2 mt-4">

          <div>

            <label className="label" htmlFor="studentPhone">

              Phone

            </label>

            <input

              id="studentPhone"

              name="phone"

              type="tel"

              className={`input-field ${fieldErrors.phone ? 'border-red-500' : ''}`}

              value={form.phone}

              onChange={(e) => {

                setForm({ ...form, phone: e.target.value });

                clearFieldError('phone');

              }}

              onBlur={() => validateField('phone', form.phone)}

            />

            {fieldErrors.phone && (

              <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>

            )}

          </div>

          <div>

            <label className="label" htmlFor="joiningDate">

              Joining Date

            </label>

            <input

              id="joiningDate"

              name="joining_date"

              type="date"

              className="input-field"

              value={form.joining_date}

              onChange={updateField}

            />

          </div>

        </div>



        {/* Blood Group */}

        <div className="mb-4 mt-4">

          <label className="label" htmlFor="studentBlood">

            Blood Group

          </label>

          <select

            id="studentBlood"

            name="blood_group"

            className="input-field"

            value={form.blood_group}

            onChange={updateField}

          >

            <option value="">Select…</option>

            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (

              <option key={bg} value={bg}>

                {bg}

              </option>

            ))}

          </select>

        </div>



        {/* Parent Fields */}

        <div className="mb-4">

          <label className="label" htmlFor="parentName">

            Parent Name

          </label>

          <input

            id="parentName"

            name="parent_name"

            className="input-field"

            value={form.parent_name}

            onChange={updateField}

          />

        </div>

        <div className="mb-4">

          <label className="label" htmlFor="parentEmail">

            Parent Email

          </label>

          <input

            id="parentEmail"

            name="parent_email"

            type="email"

            className={`input-field ${fieldErrors.parent_email ? 'border-red-500' : ''}`}

            value={form.parent_email}

            onChange={(e) => {

              setForm({ ...form, parent_email: e.target.value });

              clearFieldError('parent_email');

            }}

            onBlur={() => validateField('parent_email', form.parent_email)}

            required

          />

          {fieldErrors.parent_email && (

            <p className="mt-1 text-xs text-red-500">{fieldErrors.parent_email}</p>

          )}

        </div>

        <div className="mb-4">

          <label className="label" htmlFor="parentPhone">

            Parent Phone

          </label>

          <input

            id="parentPhone"

            name="parent_phone"

            type="tel"

            className={`input-field ${fieldErrors.parent_phone ? 'border-red-500' : ''}`}

            value={form.parent_phone}

            onChange={(e) => {

              setForm({ ...form, parent_phone: e.target.value });

              clearFieldError('parent_phone');

            }}

            onBlur={() => validateField('parent_phone', form.parent_phone)}

          />

          {fieldErrors.parent_phone && (

            <p className="mt-1 text-xs text-red-500">{fieldErrors.parent_phone}</p>

          )}

        </div>



        {/* Sport Selection (Single Select Searchable Dropdown) */}

        <div className="relative mb-4">

          <label className="label">Search & Select Sport</label>

          <div className="relative">

            <input

              type="text"

              className={`input-field w-full pr-16 text-sm ${fieldErrors.sport_ids ? 'border-red-500' : ''}`}

              placeholder={

                selectedSports.length > 0

                  ? sports?.find(s => (s.id || s.sport_id) === selectedSports[0])?.name || "Sport Selected"

                  : "Type to search sport..."

              }

              value={sportSearchQuery}

              onFocus={() => setIsSportsDropdownOpen(true)}

              onChange={(e) => {

                setSportSearchQuery(e.target.value);

                setIsSportsDropdownOpen(true);

              }}

            />

            {selectedSports.length > 0 && (

              <button

                type="button"

                className="absolute right-2 top-1.5 text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition-colors"

                onClick={() => {

                  setSelectedSports([]);

                  setSportSearchQuery('');

                  setForm(prev => ({ ...prev, batch_ids: [] }));

                }}

              >

                Clear

              </button>

            )}

          </div>

          {fieldErrors.sport_ids && (

            <p className="mt-1 text-xs text-red-500">{fieldErrors.sport_ids}</p>

          )}



          {/* Search Dropdown Panel */}

          {isSportsDropdownOpen && (

            <div className="bg-surface border-border absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border p-2 shadow-lg text-black bg-white">

              {(() => {

                const query = sportSearchQuery.toLowerCase();

                const filteredSports = sports?.filter(s => s.name?.toLowerCase().includes(query)) || [];



                if (filteredSports.length > 0) {

                  return filteredSports.map((sport) => {

                    const sportId = sport.id || sport.sport_id;

                    const isSelected = selectedSports.includes(sportId);

                    return (

                      <div

                        key={sportId}

                        className={`hover:bg-slate-100 flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-sm ${

                          isSelected ? 'bg-slate-50 font-semibold' : ''

                        }`}

                        onClick={() => {

                          setSelectedSports([sportId]);

                          setSportSearchQuery('');

                          setIsSportsDropdownOpen(false);

                          clearFieldError('sport_ids');

                          setForm(prev => ({ ...prev, batch_ids: [] }));

                        }}

                      >

                        <span className="text-foreground">{sport.name}</span>

                        {isSelected && <span className="text-emerald-600 text-xs">✓ Active</span>}

                      </div>

                    );

                  });

                } else {

                  return (

                    <p className="text-muted-foreground p-2 text-center text-xs italic">

                      No sports matches found.

                    </p>

                  );

                }

              })()}

            </div>

          )}

          {isSportsDropdownOpen && (

            <div className="fixed inset-0 z-40" onClick={() => setIsSportsDropdownOpen(false)} />

          )}

        </div>



        {/* Duration Plan & Batch Grid */}

        <div className="grid gap-4 sm:grid-cols-2">

          <div>

            <label className="label" htmlFor="durationPlan">

              Duration Plan

            </label>

            <select

              id="durationPlan"

              name="duration_plan_id"

              className="input-field"

              value={form.duration_plan_id}

              onChange={updateField}

            >

              <option value="">Select plan…</option>

              {(durationPlans || []).map((p) => (

                <option key={p.plan_id || p.id} value={p.plan_id || p.id}>

                  {p.name || p.plan_name} ({p.duration_months} months)

                </option>

              ))}

            </select>

          </div>



          <div>

            <label className="label" htmlFor="studentBatch">

              Batch Assignment

            </label>

            <select

              id="studentBatch"

              className="input-field"

              value=""

              onChange={(e) => e.target.value && handleBatchSelect(e.target.value)}

              disabled={selectedSports.length === 0}

            >

              <option value="">

                {selectedSports.length === 0

                  ? 'Select sport first…'

                  : 'Select batch…'}

              </option>

              {(availableBatches || [])

                .filter(b => selectedSports.includes(b.sport_id))

                .map((b) => (

                  <option key={b.batch_id} value={b.batch_id}>

                    {b.name || b.batch_name}

                  </option>

                ))}

            </select>

            

            {form.batch_ids && form.batch_ids.length > 0 && (

              <div className="flex flex-wrap gap-2 mt-2">

                {form.batch_ids.map(batchId => {

                  const batch = availableBatches.find(b => b.batch_id === batchId);

                  const sport = sports.find(s => (s.id || s.sport_id) === batch?.sport_id);

                  return (

                    <span

                      key={batchId}

                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium"

                    >

                      {batch?.name || batch?.batch_name} ({sport?.name || 'Selected Sport'})

                      <button

                        type="button"

                        onClick={() => handleRemoveBatch(batchId)}

                        className="ml-1 text-emerald-600 hover:text-emerald-900 font-bold"

                      >

                        ×

                      </button>

                    </span>

                  );

                })}

              </div>

            )}

            <p className="text-muted mt-1 text-xs">

              One active batch per selected sport.

            </p>

          </div>

        </div>



        {/* Financial Fields */}

        <div className="grid gap-4 sm:grid-cols-3 mt-4">

          <div>

            <label className="label" htmlFor="registrationFee">

              Registration Fee

            </label>

            <input

              id="registrationFee"

              name="registration_fee"

              type="number"

              min={0}

              step={0.01}

              className="input-field"

              value={form.registration_fee}

              onChange={updateField}

              placeholder="0"

            />

          </div>

          <div>

            <label className="label" htmlFor="additionalCharges">

              Additional Charges

            </label>

            <input

              id="additionalCharges"

              name="additional_charges"

              type="number"

              min={0}

              step={0.01}

              className="input-field"

              value={form.additional_charges}

              onChange={updateField}

              placeholder="0"

            />

          </div>

          <div>

            <label className="label" htmlFor="discount">

              Discount

            </label>

            <input

              id="discount"

              name="discount"

              type="number"

              min={0}

              step={0.01}

              className="input-field"

              value={form.discount}

              onChange={updateField}

              placeholder="0"

            />

          </div>

        </div>



        {/* Live Fee Preview Card */}

        <div className="border-accent/20 bg-accent/10 mt-4 rounded-lg border-2 p-4">

          <h4 className="text-accent mb-3 font-bold">Live Fee Preview</h4>

          <div className="text-foreground space-y-2 text-sm">

            <div className="flex justify-between">

              <span>Sports Base Fee:</span>

              <span className="font-semibold">

                ₹{formatCurrency(calculateLiveFee().totalSportsFee)}

              </span>

            </div>

            <div className="flex justify-between">

              <span>Plan Multiplier:</span>

              <span className="font-semibold">{calculateLiveFee().multiplier}x</span>

            </div>

            <div className="flex justify-between">

              <span>Sports Fee (with multiplier):</span>

              <span className="font-semibold">

                ₹{formatCurrency(calculateLiveFee().sportsFeeWithMultiplier)}

              </span>

            </div>

            <div className="flex justify-between">

              <span>Registration Fee:</span>

              <span className="font-semibold">

                ₹{formatCurrency(calculateLiveFee().registrationFee)}

              </span>

            </div>

            <div className="flex justify-between">

              <span>Additional Charges:</span>

              <span className="font-semibold">

                ₹{formatCurrency(calculateLiveFee().additionalCharges)}

              </span>

            </div>

            <div className="flex justify-between">

              <span>Discount:</span>

              <span className="text-danger font-semibold">

                -₹{formatCurrency(calculateLiveFee().discount)}

              </span>

            </div>

            <div className="border-accent/20 mt-2 flex justify-between border-t pt-2">

              <span className="font-bold">Final Fee:</span>

              <span className="text-success text-lg font-bold">

                ₹{formatCurrency(calculateLiveFee().finalFee)}

              </span>

            </div>

          </div>

        </div>



        {/* Footer Actions */}

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">

          <button

            type="button"

            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"

            onClick={() => {

              setShowAddStudentModal(false);

              setSelectedSports([]);

              setSportSearchQuery('');

            }}

          >

            Cancel

          </button>

          <button

            type="submit"

            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm"

          >

            Save Student

          </button>

        </div>

      </form>

    </div>

  </motion.div>

)}



      {showClearConfirm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">

          <div className="card animate-premiumModal max-w-md">

            <h3 className="mb-2 font-bold">Clear form?</h3>

            <p className="text-muted mb-4 text-sm">

              This removes the saved draft and resets all fields.

            </p>

            <div className="flex gap-2">

              <button

                type="button"

                className="btn-danger flex-1"

                onClick={() => {

                  clearDraft();

                  setShowClearConfirm(false);

                }}

              >

                Yes, clear

              </button>

              <button

                type="button"

                className="btn-secondary flex-1"

                onClick={() => setShowClearConfirm(false)}

              >

                Cancel

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Bulk Upload Modal */}

      {showBulkUpload && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">

          <div className="card animate-premiumModal w-full max-w-lg">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="font-bold">Bulk Import Students (CSV)</h3>

              <button

                type="button"

                className="text-muted hover:text-foreground"

                onClick={() => setShowBulkUpload(false)}

              >

                ✕

              </button>

            </div>

            <form onSubmit={handleBulkUpload}>

              <div className="mb-4">

                <button

                  type="button"

                  className="text-success hover:text-success/80 mb-2 text-sm underline transition-colors"

                  onClick={downloadSampleCSV}

                >

                  Download Sample Template

                </button>

                <label className="label" htmlFor="csvFile">

                  Select CSV File

                </label>

                <input

                  id="csvFile"

                  type="file"

                  accept=".csv"

                  className="input-field"

                  onChange={(e) => setBulkUploadFile(e.target.files[0])}

                  required

                />

                <p className="text-muted mt-2 text-xs">

                  CSV should include headers: first_name, last_name, phone, parent_name,

                  parent_email, gender, age

                </p>

              </div>

              {bulkUploadResults && (

                <div className="bg-muted mb-4 rounded p-3">

                  <p className="font-semibold">Upload Results:</p>

                  <p className="text-success text-sm">Success: {bulkUploadResults.success_count}</p>

                  <p className="text-error text-sm">Errors: {bulkUploadResults.error_count}</p>

                  {bulkUploadResults.errors.length > 0 && (

                    <details className="mt-2">

                      <summary className="cursor-pointer text-sm font-semibold">

                        View Errors

                      </summary>

                      <ul className="mt-2 space-y-1 text-xs">

                        {bulkUploadResults.errors.map((err, idx) => (

                          <li key={idx} className="text-error">

                            {err.data.first_name} {err.data.last_name}: {err.error}

                          </li>

                        ))}

                      </ul>

                    </details>

                  )}

                </div>

              )}

              <div className="flex gap-2">

                <button type="submit" className="btn-primary flex-1">

                  Upload

                </button>

                <button

                  type="button"

                  className="btn-secondary flex-1"

                  onClick={() => setShowBulkUpload(false)}

                >

                  Cancel

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* Student Detail Modal */}

      {showStudentModal && selectedStudent && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">

          <div className="card animate-premiumModal max-h-[90vh] w-full max-w-4xl overflow-y-auto">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="font-bold">Student Details</h3>

              <div className="flex gap-2">

                {!isEditingStudent && (

                  <button

                    type="button"

                    className="btn-primary btn-sm"

                    onClick={() => setIsEditingStudent(true)}

                  >

                    Edit

                  </button>

                )}

                <button

                  type="button"

                  className="text-muted hover:text-foreground"

                  onClick={() => setShowStudentModal(false)}

                >

                  ✕

                </button>

              </div>

            </div>



            {/* Tab Navigation */}

            <div className="mb-4 flex gap-2 border-b">

              {['profile', 'accounts', 'attendance', 'performance', 'notes'].map((tab) => (

                <button

                  key={tab}

                  type="button"

                  className={`px-4 py-2 capitalize transition-all duration-300 ${modalTab === tab ? 'border-success text-success bg-success/10 rounded-t-lg border-b-2 font-semibold' : 'hover:text-success text-slate-600 hover:bg-slate-100'}`}

                  onClick={() => setModalTab(tab)}

                >

                  {tab}

                </button>

              ))}

            </div>



            {loadingDetails ? (

              <Loader />

            ) : studentDetails ? (

              <div>

                {/* Profile Tab */}

                {modalTab === 'profile' && (

                  <div className="space-y-4">

                    {/* Profile Photo Section */}

                    <div className="flex items-center gap-4">

                      <div className="relative">

                        {photoPreview ? (

                          <img

                            src={photoPreview}

                            alt="Preview"

                            className="h-24 w-24 rounded-full object-cover sm:h-24 sm:w-24"

                          />

                        ) : studentDetails?.student?.profile_photo ? (

                          <img

                            src={studentDetails.student.profile_photo}

                            alt={studentDetails.student.name}

                            className="h-24 w-24 rounded-full object-cover sm:h-24 sm:w-24"

                          />

                        ) : (

                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-2xl font-semibold text-white sm:h-24 sm:w-24">

                            {studentDetails?.student?.name?.charAt(0) || '?'}

                          </div>

                        )}

                      </div>

                      <div>

                        {isEditingStudent ? (

                          <div className="flex flex-col gap-2">

                            <div className="flex gap-2">

                              <label className="btn-secondary btn-sm cursor-pointer">

                                Change Photo

                                <input

                                  type="file"

                                  accept="image/jpeg,image/jpg,image/png,image/webp"

                                  className="hidden"

                                  onChange={(e) => {

                                    const file = e.target.files[0];

                                    if (file) {

                                      const allowedTypes = [

                                        'image/jpeg',

                                        'image/jpg',

                                        'image/png',

                                        'image/webp',

                                      ];

                                      if (!allowedTypes.includes(file.type)) {

                                        setFieldError(

                                          'edit_profile_photo',

                                          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',

                                        );

                                        return;

                                      }

                                      if (file.size > 5 * 1024 * 1024) {

                                        setFieldError(

                                          'edit_profile_photo',

                                          'File size exceeds 5MB limit.',

                                        );

                                        return;

                                      }

                                      clearFieldError('edit_profile_photo');

                                      // Create instant preview

                                      const reader = new FileReader();

                                      reader.onload = (e) => {

                                        setPhotoPreview(e.target.result);

                                      };

                                      reader.readAsDataURL(file);

                                      setEditStudentForm({

                                        ...editStudentForm,

                                        profile_photo: file,

                                      });

                                    }

                                  }}

                                />

                              </label>

                              {(studentDetails?.student?.profile_photo || photoPreview) && (

                                <button

                                  type="button"

                                  className="btn-secondary btn-sm text-red-600 hover:text-red-700"

                                  onClick={() => {

                                    setEditStudentForm({ ...editStudentForm, profile_photo: null });

                                    setPhotoPreview(null);

                                    setMessage({

                                      text: 'Photo will be removed on save',

                                      type: 'info',

                                    });

                                  }}

                                >

                                  Remove Photo

                                </button>

                              )}

                            </div>

                            <p className="text-muted mt-1 text-xs">JPG, PNG, WEBP (max 5MB)</p>

                            {fieldErrors.edit_profile_photo && (

                              <p className="mt-1 text-xs text-red-500">

                                {fieldErrors.edit_profile_photo}

                              </p>

                            )}

                          </div>

                        ) : (

                          <p className="text-muted text-sm">Profile photo</p>

                        )}

                      </div>

                    </div>



                    {isEditingStudent ? (

                      <form onSubmit={handleUpdateStudent} className="space-y-4">

                        <div className="grid gap-4 sm:grid-cols-2">

                          <div>

                            <label className="label" htmlFor="editName">

                              Full Name

                            </label>

                            <input

                              id="editName"

                              type="text"

                              className="input-field"

                              value={editStudentForm.name}

                              onChange={(e) =>

                                setEditStudentForm({ ...editStudentForm, name: e.target.value })

                              }

                              required

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editEmail">

                              Parent Email

                            </label>

                            <input

                              id="editEmail"

                              type="email"

                              className="input-field"

                              value={editStudentForm.parent_email}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  parent_email: e.target.value,

                                })

                              }

                              required

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editPhone">

                              Phone

                            </label>

                            <input

                              id="editPhone"

                              type="tel"

                              className="input-field"

                              value={editStudentForm.phone}

                              onChange={(e) =>

                                setEditStudentForm({ ...editStudentForm, phone: e.target.value })

                              }

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editDob">

                              Date of Birth

                            </label>

                            <input

                              id="editDob"

                              type="date"

                              className="input-field"

                              value={editStudentForm.dob}

                              onChange={(e) => {

                                const dob = e.target.value;

                                setEditStudentForm({ ...editStudentForm, dob });

                                // Validate DOB

                                if (dob) {

                                  const birthDate = new Date(dob);

                                  const today = new Date();

                                  if (birthDate > today) {

                                    setMessage({

                                      text: 'Date of birth cannot be in the future',

                                      type: 'error',

                                    });

                                    return;

                                  }

                                  const age = calculateAgeFromDOB(dob);

                                  if (age < 1 || age > 100) {

                                    setMessage({

                                      text: 'Age must be between 1 and 100 years',

                                      type: 'error',

                                    });

                                    return;

                                  }

                                  setMessage({ text: '', type: '' });

                                }

                              }}

                              max={new Date().toISOString().split('T')[0]}

                            />

                            <p className="text-muted mt-1 text-xs">

                              Age will be calculated automatically

                            </p>

                          </div>

                          <div>

                            <label className="label" htmlFor="editCalculatedAge">

                              Age (Calculated)

                            </label>

                            <input

                              id="editCalculatedAge"

                              type="text"

                              className="input-field bg-muted"

                              value={

                                editStudentForm.dob

                                  ? `${calculateAgeFromDOB(editStudentForm.dob)} years`

                                  : ''

                              }

                              readOnly

                              disabled

                            />

                            <p className="text-muted mt-1 text-xs">Auto-calculated from DOB</p>

                          </div>

                          <div>

                            <label className="label" htmlFor="editGender">

                              Gender

                            </label>

                            <select

                              id="editGender"

                              className="input-field"

                              value={editStudentForm.gender}

                              onChange={(e) =>

                                setEditStudentForm({ ...editStudentForm, gender: e.target.value })

                              }

                              required

                            >

                              <option value="Male">Male</option>

                              <option value="Female">Female</option>

                              <option value="Other">Other</option>

                            </select>

                          </div>

                          <div>

                            <label className="label" htmlFor="editBloodGroup">

                              Blood Group

                            </label>

                            <select

                              id="editBloodGroup"

                              className="input-field"

                              value={editStudentForm.blood_group}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  blood_group: e.target.value,

                                })

                              }

                            >

                              <option value="">Select…</option>

                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (

                                <option key={bg} value={bg}>

                                  {bg}

                                </option>

                              ))}

                            </select>

                          </div>

                          <div>

                            <label className="label" htmlFor="editHeight">

                              Height (cm)

                            </label>

                            <input

                              id="editHeight"

                              type="number"

                              step="0.1"

                              min="0"

                              className="input-field"

                              value={editStudentForm.height || ''}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  height: e.target.value,

                                })

                              }

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editWeight">

                              Weight (kg)

                            </label>

                            <input

                              id="editWeight"

                              type="number"

                              step="0.1"

                              min="0"

                              className="input-field"

                              value={editStudentForm.weight || ''}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  weight: e.target.value,

                                })

                              }

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editParentName">

                              Parent Name

                            </label>

                            <input

                              id="editParentName"

                              type="text"

                              className="input-field"

                              value={editStudentForm.parent_name}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  parent_name: e.target.value,

                                })

                              }

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editParentPhone">

                              Parent Phone

                            </label>

                            <input

                              id="editParentPhone"

                              type="tel"

                              className="input-field"

                              value={editStudentForm.parent_phone}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  parent_phone: e.target.value,

                                })

                              }

                            />

                          </div>

                          <div>

                            <label className="label" htmlFor="editFeesStatus">

                              Fees Status

                            </label>

                            <select

                              id="editFeesStatus"

                              className="input-field"

                              value={editStudentForm.fees_status}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  fees_status: e.target.value,

                                })

                              }

                            >

                              <option value="paid">Paid</option>

                              <option value="unpaid">Unpaid</option>

                              <option value="partial">Partial</option>

                            </select>

                          </div>

                        </div>

                        <div className="relative">

                          <label className="label">Sports Selection (Multi-Select)</label>

                          <button

                            type="button"

                            className="input-field bg-background flex w-full items-center justify-between border text-left"

                            onClick={() => setIsSportsDropdownOpen(!isSportsDropdownOpen)}

                          >

                            <span className="truncate text-sm">

                              {editSelectedSports.length === 0

                                ? 'Select sports...'

                                : sports

                                    ?.filter((s) => editSelectedSports.includes(s.id || s.sport_id))

                                    ?.map((s) => s.name)

                                    ?.join(', ')}

                            </span>

                            <span className="text-muted-foreground ml-2 text-xs">▼</span>

                          </button>

                          {isSportsDropdownOpen && (

                            <div className="bg-surface border-border absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border p-2 shadow-lg">

                              {sports && sports.length > 0 ? (

                                sports.map((sport) => {

                                  const sportId = sport.id || sport.sport_id;

                                  const isChecked = editSelectedSports.includes(sportId);

                                  return (

                                    <label

                                      key={sportId}

                                      className="flex w-full cursor-pointer items-center space-x-3 rounded-md p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"

                                    >

                                      <input

                                        type="checkbox"

                                        className="text-primary h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"

                                        checked={isChecked}

                                        onChange={() => {

                                          if (isChecked) {

                                            setEditSelectedSports(

                                              editSelectedSports.filter((id) => id !== sportId),

                                            );

                                          } else {

                                            setEditSelectedSports([...editSelectedSports, sportId]);

                                          }

                                        }}

                                      />

                                      <span className="text-foreground font-medium">

                                        {sport.name}

                                      </span>

                                    </label>

                                  );

                                })

                              ) : (

                                <p className="text-muted-foreground p-2 text-center text-xs">

                                  No sports configured.

                                </p>

                              )}

                            </div>

                          )}

                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">

                          <div>

                            <label className="label" htmlFor="editDurationPlan">

                              Duration Plan

                            </label>

                            <select

                              id="editDurationPlan"

                              className="input-field"

                              value={editStudentForm.duration_plan_id || ''}

                              onChange={(e) =>

                                setEditStudentForm({

                                  ...editStudentForm,

                                  duration_plan_id: e.target.value,

                                })

                              }

                            >

                              <option value="">Select plan…</option>

                              {durationPlans.map((p) => (

                                <option key={p.plan_id} value={p.plan_id}>

                                  {p.name} ({p.duration_months} months) - {p.multiplier}x

                                </option>

                              ))}

                            </select>

                          </div>

                          <div>

                            <label className="label" htmlFor="editBatch">

                              Batch Assignment

                            </label>

                            <select

                              id="editBatch"

                              className="input-field"

                              value=""

                              onChange={(e) => e.target.value && handleEditBatchSelect(e.target.value)}

                              disabled={!editSelectedSports || editSelectedSports.length === 0}

                            >

                              <option value="">

                                {!editSelectedSports || editSelectedSports.length === 0

                                  ? 'Select sport first…'

                                  : 'Select batch…'}

                              </option>

                              {(availableBatches || []).map((b) => {

                                const sport = sports.find(s => s.sport_id === b.sport_id);

                                return (

                                  <option key={b.batch_id} value={b.batch_id}>

                                    {b.name} ({sport?.name || 'Unknown'})

                                  </option>

                                );

                              })}

                            </select>

                            

                            {editStudentForm.batch_ids && editStudentForm.batch_ids.length > 0 && (

                              <div className="flex flex-wrap gap-2 mt-2">

                                {editStudentForm.batch_ids.map(batchId => {

                                  const batch = availableBatches.find(b => b.batch_id === batchId);

                                  const sport = sports.find(s => s.sport_id === batch?.sport_id);

                                  return (

                                    <span

                                      key={batchId}

                                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"

                                    >

                                      {batch?.name} ({sport?.name || 'Unknown'})

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setEditStudentForm(prev => ({

                                            ...prev,

                                            batch_ids: (prev.batch_ids || []).filter(id => id !== batchId)

                                          }));

                                        }}

                                        className="ml-1 text-emerald-600 hover:text-emerald-900"

                                      >

                                        ×

                                      </button>

                                    </span>

                                  );

                                })}

                              </div>

                            )}

                            

                            <p className="text-muted mt-1 text-xs">

                              One batch per sport. Click × to remove.

                            </p>

                          </div>

                        </div>

                        <div className="flex gap-2">

                          <button type="submit" className="btn-primary flex-1">

                            Save Changes

                          </button>

                          <button

                            type="button"

                            className="btn-secondary flex-1"

                            onClick={() => setIsEditingStudent(false)}

                          >

                            Cancel

                          </button>

                        </div>

                      </form>

                    ) : (

                      <div className="grid gap-4 sm:grid-cols-2">

                        <div>

                          <label className="text-muted text-sm font-semibold">Full Name</label>

                          <p className="text-lg">{studentDetails.student.name}</p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Email</label>

                          <p>{studentDetails.student.parent_email || '—'}</p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Phone</label>

                          <p>

                            {studentDetails.student.phone ||

                              studentDetails.student.parent_phone ||

                              '—'}

                          </p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Age</label>

                          <p>{studentDetails.student.age || '—'}</p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Gender</label>

                          <p>{normalizeGender(studentDetails.student.gender)}</p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Blood Group</label>

                          <p>{studentDetails.student.blood_group || '—'}</p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Height</label>

                          <p>

                            {studentDetails.student.height

                              ? `${studentDetails.student.height} cm`

                              : '—'}

                          </p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Weight</label>

                          <p>

                            {studentDetails.student.weight

                              ? `${studentDetails.student.weight} kg`

                              : '—'}

                          </p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Joining Date</label>

                          <p>

                            {studentDetails.student.joining_date

                              ? new Date(studentDetails.student.joining_date).toLocaleDateString()

                              : '—'}

                          </p>

                        </div>

                        <div>

                          <label className="text-muted text-sm font-semibold">Parent Name</label>

                          <p>{studentDetails.student.parent_name || '—'}</p>

                        </div>

                      </div>

                    )}

                    {studentDetails.enrollments && studentDetails.enrollments.length > 0 && (

                      <div className="mt-4">

                        <h4 className="mb-2 font-semibold">Enrollments</h4>

                        <div className="space-y-2">

                          {studentDetails.enrollments.map((enrollment) => (

                            <div key={enrollment.enrollment_id} className="bg-muted rounded p-3">

                              <div className="flex items-center justify-between">

                                <span className="font-semibold">{enrollment.sport?.name}</span>

                                <span className="text-muted text-sm">

                                  {enrollment.duration_plan?.name || 'No plan'}

                                </span>

                              </div>

                              <div className="mt-2 text-sm">

                                <p>Final Fee: ₹{formatCurrency(enrollment.final_fee)}</p>

                                <p>

                                  Next Due:{' '}

                                  {enrollment.next_due_date

                                    ? new Date(enrollment.next_due_date).toLocaleDateString()

                                    : '—'}

                                </p>

                              </div>

                            </div>

                          ))}

                        </div>

                      </div>

                    )}

                  </div>

                )}



                {/* Accounts & Receipts Tab */}

                {modalTab === 'accounts' && (

                  <div>

                    {studentDetails && renderFinancialLedgerSummary(studentDetails, durationPlans)}

                    <h4 className="mb-3 font-semibold">Payment History</h4>

                    {studentDetails.receipts && studentDetails.receipts.length > 0 ? (

                      <div className="space-y-2">

                        {studentDetails.receipts.map((receipt) => (

                          <div key={receipt.receipt_id} className="rounded border p-3">

                            <div className="flex items-center justify-between">

                              <span className="font-semibold">{receipt.receipt_number}</span>

                              <span

                                className={`rounded px-2 py-0.5 text-xs font-semibold ${

                                  receipt.status === 'COMPLETED'

                                    ? 'bg-success/15 text-success'

                                    : receipt.status === 'PENDING'

                                      ? 'bg-warning/15 text-warning'

                                      : 'bg-error/15 text-error'

                                }`}

                              >

                                {receipt.status}

                              </span>

                            </div>

                            <div className="mt-2 text-sm">

                              <p>Amount: ${formatCurrency(receipt.amount)}</p>

                              <p>Date: {new Date(receipt.payment_date).toLocaleDateString()}</p>

                              <p>Method: {receipt.method || '—'}</p>

                            </div>

                          </div>

                        ))}

                      </div>

                    ) : (

                      <p className="text-muted text-center">No payment records found.</p>

                    )}

                  </div>

                )}



                {/* Attendance History Tab */}

                {modalTab === 'attendance' && (

                  <div>

                    <h4 className="mb-3 font-semibold">Attendance Calendar</h4>



                    {/* Legend */}

                    <div className="mb-4 flex flex-wrap gap-3 text-xs">

                      <div className="flex items-center gap-1">

                        <div className="h-3 w-3 rounded bg-green-500"></div>

                        <span>Present</span>

                      </div>

                      <div className="flex items-center gap-1">

                        <div className="h-3 w-3 rounded bg-red-600"></div>

                        <span>Absent</span>

                      </div>

                      <div className="flex items-center gap-1">

                        <div className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30"></div>

                        <span>Sunday</span>

                      </div>

                      <div className="flex items-center gap-1">

                        <div className="h-3 w-3 rounded bg-blue-500"></div>

                        <span>Today</span>

                      </div>

                      <div className="flex items-center gap-1">

                        <div className="h-3 w-3 rounded bg-yellow-500"></div>

                        <span>Late</span>

                      </div>

                    </div>



                    {/* Month Navigation */}

                    <div className="mb-4 flex items-center justify-between">

                      <button

                        type="button"

                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}

                        className="btn-secondary btn-sm flex items-center gap-1"

                      >

                        <ChevronLeft className="h-4 w-4" />

                        Previous

                      </button>

                      <h5 className="text-lg font-semibold">

                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

                      </h5>

                      <button

                        type="button"

                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}

                        className="btn-secondary btn-sm flex items-center gap-1"

                      >

                        Next

                        <ChevronRight className="h-4 w-4" />

                      </button>

                    </div>



                    {/* Calendar Grid */}

                    <motion.div

                      initial={{ opacity: 0, y: 10 }}

                      animate={{ opacity: 1, y: 0 }}

                      transition={{ duration: 0.3 }}

                      className="mb-4"

                    >

                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">

                        <div>Sun</div>

                        <div>Mon</div>

                        <div>Tue</div>

                        <div>Wed</div>

                        <div>Thu</div>

                        <div>Fri</div>

                        <div>Sat</div>

                      </div>

                      <div className="grid grid-cols-7 gap-1">

                        {getDaysInMonth(calendarMonth).map((date, index) => {

                          if (!date) {

                            return <div key={`empty-${index}`} className="aspect-square"></div>;

                          }



                          const attendance = getAttendanceForDate(studentDetails.attendance, date);

                          const isDateSelected = selectedDate && isSameDay(date, selectedDate);

                          const isDateFuture = isFutureDate(date);



                          return (

                            <motion.button

                              key={date.toISOString()}

                              type="button"

                              disabled={isDateFuture}

                              whileHover={!isDateFuture ? { scale: 1.05 } : {}}

                              whileTap={!isDateFuture ? { scale: 0.95 } : {}}

                              onClick={() => !isDateFuture && setSelectedDate(date)}

                              className={`aspect-square rounded-lg text-xs font-medium transition-all ${

                                getAttendanceColor(date, studentDetails.attendance, selectedDate)

                              } ${isDateSelected ? 'ring-2 ring-offset-2 ring-primary' : ''}`}

                            >

                              {date.getDate()}

                            </motion.button>

                          );

                        })}

                      </div>

                    </motion.div>



                    {/* Monthly Attendance Summary */}

                    <div className="mb-3 rounded-lg bg-surface-secondary/50 border border-border p-3">

                      <h5 className="mb-2 font-semibold text-xs">Monthly Summary</h5>

                      <div className="grid grid-cols-2 gap-2 text-xs">

                        <div className="flex items-center gap-1.5">

                          <div className="h-2 w-2 rounded bg-green-500"></div>

                          <span>Present: <strong>{studentDetails.attendance?.filter(a => a.status === 'PRESENT' && new Date(a.date).getMonth() === calendarMonth.getMonth() && new Date(a.date).getFullYear() === calendarMonth.getFullYear()).length || 0}</strong></span>

                        </div>

                        <div className="flex items-center gap-1.5">

                          <div className="h-2 w-2 rounded bg-red-600"></div>

                          <span>Absent: <strong>{studentDetails.attendance?.filter(a => a.status === 'ABSENT' && new Date(a.date).getMonth() === calendarMonth.getMonth() && new Date(a.date).getFullYear() === calendarMonth.getFullYear()).length || 0}</strong></span>

                        </div>

                        <div className="flex items-center gap-1.5">

                          <div className="h-2 w-2 rounded bg-yellow-500"></div>

                          <span>Late: <strong>{studentDetails.attendance?.filter(a => a.status === 'LATE' && new Date(a.date).getMonth() === calendarMonth.getMonth() && new Date(a.date).getFullYear() === calendarMonth.getFullYear()).length || 0}</strong></span>

                        </div>

                        <div className="flex items-center gap-1.5">

                          <div className="h-2 w-2 rounded bg-red-100 dark:bg-red-900/30"></div>

                          <span>Sundays: <strong>{getDaysInMonth(calendarMonth).filter(d => d && isSunday(d)).length}</strong></span>

                        </div>

                      </div>

                      <div className="mt-2 pt-2 border-t border-border">

                        <span className="text-xs">

                          Attendance Percentage: <strong className="text-primary">

                            {(() => {

                              const presentCount = studentDetails.attendance?.filter(a => a.status === 'PRESENT' && new Date(a.date).getMonth() === calendarMonth.getMonth() && new Date(a.date).getFullYear() === calendarMonth.getFullYear()).length || 0;

                              const absentCount = studentDetails.attendance?.filter(a => a.status === 'ABSENT' && new Date(a.date).getMonth() === calendarMonth.getMonth() && new Date(a.date).getFullYear() === calendarMonth.getFullYear()).length || 0;

                              const total = presentCount + absentCount;

                              return total > 0 ? ((presentCount / total) * 100).toFixed(1) + '%' : '0%';

                            })()}

                          </strong>

                        </span>

                      </div>
                    </div>



                    {/* Attendance Details Panel */}

                    <AnimatePresence>

                      {selectedDate && (

                        <motion.div

                          initial={{ opacity: 0, height: 0 }}

                          animate={{ opacity: 1, height: 'auto' }}

                          exit={{ opacity: 0, height: 0 }}

                          className="rounded-lg bg-surface-secondary/50 border border-border p-4"

                        >

                          <h5 className="mb-3 font-semibold flex items-center gap-2">

                            <Calendar className="h-4 w-4" />

                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

                          </h5>

                          {(() => {

                            const attendance = getAttendanceForDate(studentDetails.attendance, selectedDate);

                            if (attendance) {

                              return (

                                <div className="space-y-2 text-sm">

                                  <div className="flex items-center justify-between">

                                    <span className="text-muted-foreground">Status:</span>

                                    <span

                                      className={`rounded px-2 py-0.5 text-xs font-semibold ${

                                        attendance.status === 'PRESENT'

                                          ? 'bg-success/15 text-success'

                                          : attendance.status === 'ABSENT'

                                            ? 'bg-error/15 text-error'

                                            : attendance.status === 'LATE'

                                              ? 'bg-warning/15 text-warning'

                                              : 'bg-muted'

                                      }`}

                                    >

                                      {attendance.status}

                                    </span>

                                  </div>

                                  <div className="flex items-center justify-between">

                                    <span className="text-muted-foreground">Batch:</span>

                                    <span>{attendance.batch?.name || '—'}</span>

                                  </div>

                                  {attendance.check_in_time && (

                                    <div className="flex items-center justify-between">

                                      <span className="text-muted-foreground">Check-in:</span>

                                      <span>{new Date(attendance.check_in_time).toLocaleTimeString()}</span>

                                    </div>

                                  )}

                                  {attendance.check_out_time && (

                                    <div className="flex items-center justify-between">

                                      <span className="text-muted-foreground">Check-out:</span>

                                      <span>{new Date(attendance.check_out_time).toLocaleTimeString()}</span>

                                    </div>

                                  )}

                                  {attendance.remarks && (

                                    <div>

                                      <span className="text-muted-foreground">Remarks:</span>

                                      <p className="mt-1">{attendance.remarks}</p>

                                    </div>

                                  )}

                                  {attendance.marked_by && (

                                    <div className="flex items-center justify-between">

                                      <span className="text-muted-foreground">Marked By:</span>

                                      <span>{attendance.marked_by}</span>

                                    </div>

                                  )}

                                </div>

                              );

                            } else {

                              return (

                                <p className="text-muted-foreground text-sm">No attendance recorded for this date.</p>

                              );

                            }

                          })()}

                        </motion.div>

                      )}

                    </AnimatePresence>

                  </div>

                )}



                {/* Performance Scores Tab */}

                {modalTab === 'performance' && (

                  <div>

                    <h4 className="mb-3 font-semibold">Performance Scores</h4>

                    {studentDetails.performance_scores &&

                    studentDetails.performance_scores.length > 0 ? (

                      <div className="space-y-4">

                        {studentDetails.performance_scores.map((score) => (

                          <div key={score.score_id} className="rounded border p-3">

                            <div className="flex items-center justify-between">

                              <span className="font-semibold">{score.attribute?.name}</span>

                              <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-sm font-semibold">

                                {score.score}/10

                              </span>

                            </div>

                            <div className="mt-2 text-sm">

                              <p>Sport: {score.attribute?.sport?.name || '—'}</p>

                              <p>Coach: {score.coach?.name || '—'}</p>

                              <p>Date: {new Date(score.scored_at).toLocaleDateString()}</p>

                              {score.notes && <p className="mt-1 italic">Notes: {score.notes}</p>}

                            </div>

                          </div>

                        ))}

                      </div>

                    ) : (

                      <p className="text-muted text-center">No performance scores found.</p>

                    )}

                  </div>

                )}



                {/* Daily Notes Tab */}

                {modalTab === 'notes' && (

                  <div>

                    <h4 className="mb-3 font-semibold">Daily Student Notes</h4>

                    {studentDetails.daily_notes && studentDetails.daily_notes.length > 0 ? (

                      <div className="space-y-4">

                        {studentDetails.daily_notes.map((note) => (

                          <div key={note.note_id} className="rounded border p-4">

                            <div className="mb-2 flex items-center justify-between">

                              <span className="font-semibold">

                                {new Date(note.note_date).toLocaleDateString()}

                              </span>

                              <span className="text-muted text-xs">

                                Coach: {note.coach?.name || '—'}

                              </span>

                            </div>

                            <div className="space-y-2 text-sm">

                              {note.performance_notes && (

                                <div>

                                  <span className="text-accent font-medium">Performance:</span>

                                  <p className="mt-1">{note.performance_notes}</p>

                                </div>

                              )}

                              {note.behaviour_notes && (

                                <div>

                                  <span className="text-accent font-medium">Behaviour:</span>

                                  <p className="mt-1">{note.behaviour_notes}</p>

                                </div>

                              )}

                              {note.achievements && (

                                <div>

                                  <span className="text-accent font-medium">Achievements:</span>

                                  <p className="mt-1">{note.achievements}</p>

                                </div>

                              )}

                              {note.improvement_areas && (

                                <div>

                                  <span className="text-accent font-medium">

                                    Improvement Areas:

                                  </span>

                                  <p className="mt-1">{note.improvement_areas}</p>

                                </div>

                              )}

                              {note.emailed_at && (

                                <p className="text-muted mt-2 text-xs">

                                  Emailed to parent: {new Date(note.emailed_at).toLocaleString()}

                                </p>

                              )}

                            </div>

                          </div>

                        ))}

                      </div>

                    ) : (

                      <p className="text-muted text-center">No daily notes found.</p>

                    )}

                  </div>

                )}

              </div>

            ) : (

              <p className="text-muted text-center">Failed to load student details.</p>

            )}

          </div>

        </div>

      )}



  {/* Edit Student Modal */}

  {isEditingStudent && (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">

      <div className="card animate-premiumModal max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 rounded-lg shadow-xl relative">

        <div className="mb-4 flex items-center justify-between border-b pb-3">

          <h3 className="font-bold text-lg text-slate-800">Edit Student Profile</h3>

          <button

            type="button"

            className="text-muted hover:text-foreground text-slate-400 hover:text-slate-600 transition-colors"

            onClick={() => {

              setIsEditingStudent(false);

              setSportSearchQuery('');

              setBatchSearchQuery('');

              setEditPhotoPreview(null);

              setEditStudentForm(prev => ({ ...prev, profile_photo: null }));

            }}

          >

            ✕

          </button>

        </div>



        <form onSubmit={handleEditStudentSubmit}>

          <div className="space-y-4">

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

              <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editName">

                Student Name

              </label>

              <input

                id="editName"

                type="text"

                className="input-field w-full p-2 border rounded-md"

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

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editParentName">

                  Parent Name

                </label>

                <input

                  id="editParentName"

                  type="text"

                  className="input-field w-full p-2 border rounded-md"

                  value={editStudentForm.parent_name || ''}

                  onChange={(e) =>

                    setEditStudentForm({ ...editStudentForm, parent_name: e.target.value })

                  }

                />

              </div>

              <div>

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editParentEmail">

                  Parent Email

                </label>

                <input

                  id="editParentEmail"

                  type="email"

                  className="input-field w-full p-2 border rounded-md"

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

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editParentPhone">

                  Parent Phone

                </label>

                <input

                  id="editParentPhone"

                  type="tel"

                  className="input-field w-full p-2 border rounded-md"

                  value={editStudentForm.parent_phone || ''}

                  onChange={(e) =>

                    setEditStudentForm({ ...editStudentForm, parent_phone: e.target.value })

                  }

                />

              </div>

              <div>

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editPhone">

                  Student Phone

                </label>

                <input

                  id="editPhone"

                  type="tel"

                  className="input-field w-full p-2 border rounded-md"

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

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editAge">

                  Age

                </label>

                <input

                  id="editAge"

                  type="number"

                  className="input-field w-full p-2 border rounded-md"

                  value={editStudentForm.age || ''}

                  onChange={(e) =>

                    setEditStudentForm({ ...editStudentForm, age: e.target.value })

                  }

                  min="1"

                  max="100"

                />

              </div>

              <div>

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editGender">

                  Gender

                </label>

                <select

                  id="editGender"

                  className="input-field w-full p-2 border rounded-md bg-white"

                  value={editStudentForm.gender || ''}

                  onChange={(e) =>

                    setEditStudentForm({ ...editStudentForm, gender: e.target.value })

                  }

                >

                  <option value="">Select Gender</option>

                  <option value="male">Male</option>

                  <option value="female">Female</option>

                  <option value="other">Other</option>

                </select>

              </div>

              <div>

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editBloodGroup">

                  Blood Group

                </label>

                <select

                  id="editBloodGroup"

                  className="input-field w-full p-2 border rounded-md bg-white"

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

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editHeight">

                  Height (cm)

                </label>

                <input

                  id="editHeight"

                  type="number"

                  className="input-field w-full p-2 border rounded-md"

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

                <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editWeight">

                  Weight (kg)

                </label>

                <input

                  id="editWeight"

                  type="number"

                  className="input-field w-full p-2 border rounded-md"

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



            {/* Date Options */}

            <div>

              <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editJoiningDate">

                Joining Date

              </label>

              <input

                id="editJoiningDate"

                type="date"

                className="input-field w-full p-2 border rounded-md"

                value={editStudentForm.joining_date ? editStudentForm.joining_date.split('T')[0] : ''}

                onChange={(e) =>

                  setEditStudentForm({ ...editStudentForm, joining_date: e.target.value })

                }

              />

            </div>



            <hr className="my-2 border-slate-200" />



            {/* 1. SEARCH & SELECT SPORT */}

            <div className="relative">

              <label className="label block text-sm font-medium text-slate-700 mb-1">

                Search & Select Sport

              </label>

              <div className="relative">

                <input

                  type="text"

                  className="input-field w-full p-2 pr-16 border rounded-md text-sm"

                  placeholder={

                    editStudentForm.sport_id

                      ? sports?.find(s => (s.sport_id || s.id) == editStudentForm.sport_id)?.name || "Sport Selected"

                      : "Type to search sport..."

                  }

                  value={sportSearchQuery || ''}

                  onFocus={() => setIsSportsDropdownOpen(true)}

                  onChange={(e) => {

                    setSportSearchQuery(e.target.value);

                    setIsSportsDropdownOpen(true);

                  }}

                  onClick={(e) => e.stopPropagation()}

                />

                {editStudentForm.sport_id && (

                  <button

                    type="button"

                    className="absolute right-2 top-2 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"

                    onClick={() => {

                      setEditStudentForm(prev => ({ ...prev, sport_id: '', batch_id: '' }));

                      setSportSearchQuery('');

                      setBatchSearchQuery('');

                    }}

                  >

                    Clear

                  </button>

                )}

              </div>



              {/* Sports Dropdown */}

              {isSportsDropdownOpen && (

                <div 

                  className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"

                  onClick={(e) => e.stopPropagation()}

                >

                  {(() => {

                    const query = (sportSearchQuery || '').toLowerCase();

                    const filtered = sports?.filter(s => s.name?.toLowerCase().includes(query)) || [];

                    

                    if (filtered.length > 0) {

                      return filtered.map((sport) => {

                        const currentSportId = sport.sport_id || sport.id;

                        const isSelected = editStudentForm.sport_id == currentSportId;

                        return (

                          <div

                            key={currentSportId}

                            className={`flex items-center justify-between rounded-md p-2 text-sm cursor-pointer hover:bg-slate-50 ${

                              isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'

                            }`}

                            onClick={() => {

                              setEditStudentForm(prev => ({ ...prev, sport_id: currentSportId, batch_id: '' }));

                              setSportSearchQuery('');

                              setBatchSearchQuery('');

                              setIsSportsDropdownOpen(false);

                            }}

                          >

                            <span>{sport.name}</span>

                            {isSelected && <span className="text-emerald-600 text-xs">✓ Active</span>}

                          </div>

                        );

                      });

                    } else {

                      return <p className="p-2 text-center text-xs italic text-slate-400">No sports found.</p>;

                    }

                  })()}

                </div>

              )}

            </div>



            {/* 2. SEARCH & SELECT BATCH */}

            <div className="relative">

              <label className="label block text-sm font-medium text-slate-700 mb-1">

                Search & Assign Batch

              </label>

              <div className="relative">

                <input

                  type="text"

                  className="input-field w-full p-2 pr-16 border rounded-md text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"

                  placeholder={

                    !editStudentForm.sport_id

                      ? "Select a sport first..."

                      : editStudentForm.batch_id

                        ? editAvailableBatches?.find(b => b.batch_id == editStudentForm.batch_id)?.name || "Batch Assigned"

                        : "Type to search batch..."

                  }

                  value={batchSearchQuery || ''}

                  disabled={!editStudentForm.sport_id}

                  onFocus={() => setIsBatchesDropdownOpen(true)}

                  onChange={(e) => {

                    setBatchSearchQuery(e.target.value);

                    setIsBatchesDropdownOpen(true);

                  }}

                  onClick={(e) => e.stopPropagation()}

                />

                {editStudentForm.batch_id && (

                  <button

                    type="button"

                    className="absolute right-2 top-2 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"

                    onClick={() => {

                      setEditStudentForm(prev => ({ ...prev, batch_id: '' }));

                      setBatchSearchQuery('');

                    }}

                  >

                    Clear

                  </button>

                )}

              </div>



              {/* Batches Dropdown */}

              {isBatchesDropdownOpen && editStudentForm.sport_id && (

                <div 

                  className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"

                  onClick={(e) => e.stopPropagation()}

                >

                  {(() => {

                    const query = (batchSearchQuery || '').toLowerCase();

                    const filteredBatches = (editAvailableBatches || [])

                      .filter(b => (b.name || b.batch_name || '').toLowerCase().includes(query));



                    if (filteredBatches.length > 0) {

                      return filteredBatches.map((batch) => {

                        const isSelected = editStudentForm.batch_id == batch.batch_id;

                        return (

                          <div

                            key={batch.batch_id}

                            className={`flex items-center justify-between rounded-md p-2 text-sm cursor-pointer hover:bg-slate-50 ${

                              isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'

                            }`}

                            onClick={() => {

                              setEditStudentForm(prev => ({ ...prev, batch_id: batch.batch_id }));

                              setBatchSearchQuery('');

                              setIsBatchesDropdownOpen(false);

                            }}

                          >

                            <span>{batch.name || batch.batch_name}</span>

                            {isSelected && <span className="text-emerald-600 text-xs">✓ Assigned</span>}

                          </div>

                        );

                      });

                    } else {

                      return <p className="p-2 text-center text-xs italic text-slate-400">No matching batches found.</p>;

                    }

                  })()}

                </div>

              )}

            </div>



            {/* Duration Plan */}

            <div>

              <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="editDurationPlan">

                Duration Plan

              </label>

              <select

                id="editDurationPlan"

                className="input-field w-full p-2 border rounded-md bg-white text-sm"

                value={editStudentForm.duration_plan_id || ''}

                onChange={(e) =>

                  setEditStudentForm({ ...editStudentForm, duration_plan_id: e.target.value })

                }

              >

                <option value="">Select Duration Plan</option>

                {(durationPlans || []).map((plan) => (

                  <option key={plan.plan_id || plan.id} value={plan.plan_id || plan.id}>

                    {plan.name} ({plan.duration_months} months)

                  </option>

                ))}

              </select>

            </div>



            {/* Action Footer */}

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">

              <button

                type="button"

                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"

                onClick={() => {

                  setIsEditingStudent(false);

                  setSportSearchQuery('');

                  setBatchSearchQuery('');

                  setEditPhotoPreview(null);

                  setEditStudentForm(prev => ({ ...prev, profile_photo: null }));

                }}

              >

                Cancel

              </button>

              <motion.button 

                type="submit" 

                disabled={isUploadingPhoto}

                whileHover={{ scale: isUploadingPhoto ? 1 : 1.02 }}

                whileTap={{ scale: isUploadingPhoto ? 1 : 0.98 }}

                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors flex items-center gap-2 ${

                  isUploadingPhoto 

                    ? 'bg-slate-400 cursor-not-allowed' 

                    : 'bg-emerald-600 hover:bg-emerald-700'

                }`}

              >

                {isUploadingPhoto ? (

                  <>

                    <motion.div

                      animate={{ rotate: 360 }}

                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}

                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"

                    />

                    Saving...

                  </>

                ) : (

                  'Save Changes'

                )}

              </motion.button>

            </div>

          </div>

        </form>

      </div>

    </div>

  )}

  {/* Pause Student Modal */}
  {showPauseModal && pauseStudent && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card animate-premiumModal max-w-md w-full"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Pause Student Plan</h3>
          <button
            type="button"
            onClick={() => setShowPauseModal(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePauseSubmit} className="space-y-4">
          <div>
            <label className="label block text-sm font-medium text-slate-700 mb-1">
              Student
            </label>
            <div className="text-sm font-semibold text-slate-900">
              {pauseStudent.name || `${pauseStudent.first_name || ''} ${pauseStudent.last_name || ''}`}
            </div>
          </div>

          <div>
            <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="pause_start_date">
              Pause Start Date
            </label>
            <input
              type="date"
              id="pause_start_date"
              className="input-field w-full"
              value={pauseForm.pause_start_date}
              onChange={(e) => setPauseForm({ ...pauseForm, pause_start_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label block text-sm font-medium text-slate-700 mb-1">
              Pause Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                id="pause_duration"
                className="input-field w-full"
                placeholder="Duration"
                value={pauseForm.pause_duration}
                onChange={(e) => setPauseForm({ ...pauseForm, pause_duration: e.target.value, pause_end_date: '' })}
                min="1"
              />
              <select
                id="pause_duration_unit"
                className="input-field w-full"
                value={pauseForm.pause_duration_unit}
                onChange={(e) => setPauseForm({ ...pauseForm, pause_duration_unit: e.target.value, pause_end_date: '' })}
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="pause_end_date">
              Or Custom End Date
            </label>
            <input
              type="date"
              id="pause_end_date"
              className="input-field w-full"
              value={pauseForm.pause_end_date}
              onChange={(e) => setPauseForm({ ...pauseForm, pause_end_date: e.target.value, pause_duration: '', pause_duration_unit: 'days' })}
              min={pauseForm.pause_start_date}
            />
          </div>

          {calculateResumeDate() && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm font-medium text-emerald-800">
                Estimated Resume Date: <span className="font-bold">{calculateResumeDate()}</span>
              </p>
            </div>
          )}

          <div>
            <label className="label block text-sm font-medium text-slate-700 mb-1" htmlFor="pause_reason">
              Pause Reason (Optional)
            </label>
            <textarea
              id="pause_reason"
              className="input-field w-full"
              rows="3"
              placeholder="Enter reason for pause..."
              value={pauseForm.pause_reason}
              onChange={(e) => setPauseForm({ ...pauseForm, pause_reason: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPauseModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              Pause Plan
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )}



    </motion.div>

  );

};
