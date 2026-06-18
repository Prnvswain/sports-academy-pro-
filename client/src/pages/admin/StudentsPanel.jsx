import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { useFormDraft } from '../../hooks/useFormDraft';
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/client';

const formatCurrency = (value) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(2)
    : '0.00';

const normalizeGender = (gender) => {
  if (!gender) return 'Not Specified';
  const normalized = gender.toString().toLowerCase().trim();
  if (['male', 'm'].includes(normalized)) return 'Male';
  if (['female', 'f'].includes(normalized)) return 'Female';
  if (['other'].includes(normalized)) return 'Other';
  return 'Not Specified';
};

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: 'Male',
  blood_group: '',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  phone: '',
  batch_id: '',
  duration_plan_id: '',
  registration_fee: '',
  additional_charges: '',
  discount: '',
  joining_date: new Date().toISOString().split('T')[0]
};

export default function StudentsPanel() {
  const { form, setForm, updateField, clearDraft, draftSavedAt } = useFormDraft(
    'sams_draft_student_form',
    emptyForm
  );
  const [students, setStudents] = useState([]);
  const [sports, setSports] = useState([]);
  const [durationPlans, setDurationPlans] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedSports, setSelectedSports] = useState([]);
  const [isSportsDropdownOpen, setIsSportsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalTab, setModalTab] = useState('profile');
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [selectedStudentForView, setSelectedStudentForView] = useState(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({});
  const [editSelectedSports, setEditSelectedSports] = useState([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, sportsRes, plansRes] = await Promise.all([
        adminGet('/admin/students'),
        adminGet('/admin/sports'),
        adminGet('/admin/duration-plans')
      ]);
      setStudents(studentsRes.data || []);
      
      const sportsData = sportsRes.data;
      if (Array.isArray(sportsData)) {
        setSports(sportsData);
      } else if (sportsData && Array.isArray(sportsData.data)) {
        setSports(sportsData.data);
      } else if (sportsData && Array.isArray(sportsData.available_sports)) {
        setSports(sportsData.available_sports);
      } else if (sportsData && Array.isArray(sportsData.sports)) {
        setSports(sportsData.sports);
      } else {
        setSports([]);
      }
      
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

  useEffect(() => {
    if (!selectedSports || selectedSports.length === 0) {
      setAvailableBatches([]);
      setForm((prev) => ({ ...prev, batch_id: '' }));
      return;
    }

    const loadBatches = async () => {
      try {
        const result = await adminGet(
          `/admin/batches/available?sport_id=${encodeURIComponent(selectedSports[0])}`
        );
        setAvailableBatches(result.data || []);
        setForm((prev) => {
          if (
            prev.batch_id &&
            !(result.data || []).some((b) => String(b.batch_id) === String(prev.batch_id))
          ) {
            return { ...prev, batch_id: '' };
          }
          return prev;
        });
      } catch (error) {
        setMessage({ text: error.message, type: 'error' });
      }
    };

    loadBatches();
  }, [selectedSports, setForm]);

  const calculateLiveFee = () => {
    const selectedSportIds = selectedSports || [];
    let totalSportsFee = 0;
    
    (selectedSportIds || []).forEach(sportId => {
      const sport = (sports || []).find(s => s?.sport_id && String(s.sport_id) === String(sportId));
      if (sport) {
        totalSportsFee += parseFloat(sport?.base_fee || sport?.baseFee || 0) || 0;
      }
    });

    const safePlansArray = durationPlans || [];
    const durationPlan = safePlansArray.find(p => p?.plan_id && String(p.plan_id) === String(form.duration_plan_id));
    const multiplier = durationPlan ? parseFloat(durationPlan?.multiplier || 1) : 1;
    
    const sportsFeeWithMultiplier = totalSportsFee * (isNaN(multiplier) ? 1 : multiplier);
    const registrationFee = parseFloat(form?.registration_fee || form?.registrationFee || 0) || 0;
    const additionalCharges = parseFloat(form?.additional_charges || form?.additionalCharges || 0) || 0;
    const discount = parseFloat(form?.discount || 0) || 0;
    
    const finalFee = sportsFeeWithMultiplier + registrationFee + additionalCharges - discount;
    
    return {
      totalSportsFee,
      multiplier,
      sportsFeeWithMultiplier,
      registrationFee,
      additionalCharges,
      discount,
      finalFee
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const feeBreakdown = calculateLiveFee();
      const fullName = `${form.firstName} ${form.middleName} ${form.lastName}`.trim();
      const result = await adminPost('/admin/students', {
        name: fullName,
        first_name: form.firstName.trim() || undefined,
        middle_name: form.middleName.trim() || undefined,
        last_name: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        age: parseInt(form.age, 10),
        gender: form.gender,
        blood_group: form.bloodGroup || form.blood_group || undefined,
        parent_name: form.parent_name.trim() || undefined,
        parent_email: form.parent_email.trim(),
        parent_phone: form.parent_phone.trim() || undefined,
        sport_ids: selectedSports.map(id => parseInt(id, 10)),
        batch_id: form.batch_id ? parseInt(form.batch_id, 10) : undefined,
        duration_plan_id: form.duration_plan_id ? parseInt(form.duration_plan_id, 10) : undefined,
        registration_fee: parseFloat(form.registrationFee || form.registration_fee || 0),
        additional_charges: parseFloat(form.additionalCharges || form.additional_charges || 0),
        discount: parseFloat(form.discount || 0),
        joining_date: form.joining_date
      });
      setMessage({ text: result.message, type: 'success' });
      clearDraft();
      setSelectedSports([]);
      setShowAddStudentModal(false);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleExit = async (studentId) => {
    const exit_reason = window.prompt('Exit reason (required):');
    if (!exit_reason?.trim()) return;
    const exit_note = window.prompt('Exit note (optional):') || undefined;
    try {
      const result = await adminPost(`/admin/students/${studentId}/exit`, {
        exit_reason: exit_reason.trim(),
        exit_note
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
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.student_id === studentId ? { ...s, status: 'ACTIVE' } : s
        )
      );
      await adminPut(`/admin/students/${studentId}`, { status: 'ACTIVE' });
      setMessage({ text: 'Student marked as active successfully.', type: 'success' });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadData(); // Revert on error
    }
  };

  const handleDeactivate = async (studentId) => {
    try {
      // Update local state immediately for real-time feedback
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.student_id === studentId ? { ...s, status: 'INACTIVE' } : s
        )
      );
      await adminPut(`/admin/students/${studentId}`, { status: 'INACTIVE' });
      setMessage({ text: 'Student deactivated successfully.', type: 'success' });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadData(); // Revert on error
    }
  };

  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
    setModalTab('profile');
    setIsEditingStudent(false);
    setLoadingDetails(true);
    try {
      const detailsRes = await adminGet(`/admin/students/${student.student_id}/details`);
      setStudentDetails(detailsRes.data);
      // Initialize edit form with student data
      setEditStudentForm({
        name: detailsRes.data.student.name,
        phone: detailsRes.data.student.phone || '',
        age: detailsRes.data.student.age,
        gender: detailsRes.data.student.gender,
        blood_group: detailsRes.data.student.blood_group || '',
        parent_name: detailsRes.data.student.parent_name || '',
        parent_email: detailsRes.data.student.parent_email || '',
        parent_phone: detailsRes.data.student.parent_phone || '',
        fees_status: detailsRes.data.student.fees_status || 'unpaid',
        batch_id: detailsRes.data.student.batch_id || ''
      });
      // Initialize selected sports from enrollments
      const activeSportIds = (detailsRes?.data?.enrollments || [])
        ?.filter(e => e?.is_active)
        ?.map(e => e?.sport_id) || [];
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
      const result = await adminPut(`/admin/students/${selectedStudent.student_id}`, {
        name: editStudentForm.name,
        phone: editStudentForm.phone,
        age: parseInt(editStudentForm.age, 10),
        gender: editStudentForm.gender,
        blood_group: editStudentForm.blood_group,
        parent_name: editStudentForm.parent_name,
        parent_email: editStudentForm.parent_email,
        parent_phone: editStudentForm.parent_phone,
        fees_status: editStudentForm.fees_status,
        sport_ids: editSelectedSports,
        duration_plan_id: editStudentForm.duration_plan_id ? parseInt(editStudentForm.duration_plan_id, 10) : undefined,
        batch_id: editStudentForm.batch_id ? parseInt(editStudentForm.batch_id, 10) : undefined
      });
      setMessage({ text: result.message || 'Student updated successfully', type: 'success' });
      setIsEditingStudent(false);
      // Reload student details
      const detailsRes = await adminGet(`/admin/students/${selectedStudent.student_id}/details`);
      setStudentDetails(detailsRes.data);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const downloadSampleCSV = () => {
    const headers = "first_name,last_name,phone,parent_name,parent_email,gender,age\n";
    const sampleRow = "John,Doe,1234567890,Robert Doe,robert@example.com,male,14\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
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
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const students = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
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
          type: result.error_count > 0 ? 'warning' : 'success' 
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

  const filteredStudents = (students || []).filter(student => {
    const matchesSearch = !searchQuery || 
      (student.name && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.first_name && student.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.last_name && student.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.parent_email && student.parent_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.phone && student.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.parent_phone && student.parent_phone.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSport = !filterSport || 
      student.sport_id === parseInt(filterSport) ||
      (student.enrollments && Array.isArray(student.enrollments) && student.enrollments.some(e => e.sport_id === parseInt(filterSport)));
    
    const matchesBatch = !filterBatch || student.batch_id === parseInt(filterBatch);
    
    return matchesSearch && matchesSport && matchesBatch;
  });

  return (
    <motion.div 
      className="space-y-6 p-6"
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
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search students..."
              className="input-field w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <select
              className="input-field w-full"
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
            >
              <option value="">All Sports</option>
              {(sports || []).map((s) => (
                <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <select
              className="input-field w-full"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {(availableBatches || []).map((b) => (
                <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
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
                    <label className="text-sm font-semibold text-muted">Student ID</label>
                    <p>{studentDetails?.student?.student_id || selectedStudent?.student_id || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Full Name</label>
                    <p className="text-lg">
                      {[
                        studentDetails?.student?.first_name,
                        studentDetails?.student?.middle_name,
                        studentDetails?.student?.last_name
                      ].filter(Boolean).join(' ') || studentDetails?.student?.name || selectedStudent?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Email</label>
                    <p>{studentDetails?.student?.parent_email || selectedStudent?.parent_email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Phone</label>
                    <p>{studentDetails?.student?.phone || selectedStudent?.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Age</label>
                    <p>{studentDetails?.student?.age || selectedStudent?.age || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Gender</label>
                    <p>{normalizeGender(studentDetails?.student?.gender || selectedStudent?.gender)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Blood Group</label>
                    <p>{studentDetails?.student?.blood_group || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Joining Date</label>
                    <p>
                      {(() => {
                        try {
                          const date = studentDetails?.student?.joining_date || selectedStudent?.joining_date;
                          return date ? new Date(date).toLocaleDateString() : '—';
                        } catch (e) {
                          return '—';
                        }
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Parent Name</label>
                    <p>{studentDetails?.student?.parent_name || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Parent Email</label>
                    <p>{studentDetails?.student?.parent_email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Parent Phone</label>
                    <p>{studentDetails?.student?.parent_phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Fee Status</label>
                    <p>{studentDetails?.student?.fees_status || selectedStudent?.fees_status || '—'}</p>
                  </div>
                </div>
                {studentDetails?.enrollments && Array.isArray(studentDetails.enrollments) && studentDetails.enrollments.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="mb-2 font-semibold">Enrollments</h4>
                    <div className="space-y-2">
                      {studentDetails.enrollments.map((enrollment, idx) => {
                        const enrollmentId = enrollment?.enrollment_id || enrollment?.id || idx;
                        const sportName = typeof enrollment?.sport === 'string' 
                          ? enrollment.sport 
                          : (enrollment?.sport?.name || enrollment?.sport || 'Unassigned');
                        const batchName = typeof enrollment?.batch === 'string' 
                          ? enrollment.batch 
                          : (enrollment?.batch?.name || enrollment?.batch || 'N/A');
                        const planName = enrollment?.duration_plan?.name || enrollment?.durationPlan?.name || 'No plan';
                        
                        return (
                          <div key={enrollmentId} className="rounded bg-muted p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{sportName}</span>
                              <span className="text-sm text-muted">{batchName}</span>
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
                <div className="mt-4 p-4 rounded-lg border bg-accent/10 border-accent/20">
                  <h4 className="mb-3 font-bold text-accent">Financial Accounts Matrix</h4>
                  {studentDetails?.enrollments && Array.isArray(studentDetails.enrollments) && studentDetails.enrollments.length > 0 ? (
                    <>
                      {/* Combined Financial Summary */}
                      <div className="mb-4 p-3 rounded-lg bg-accent/20 border border-accent/30">
                        <h5 className="mb-2 font-semibold text-accent">Combined Financial Summary</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Registration Fee:</span>
                            <span className="font-semibold">${formatCurrency(
                              studentDetails.enrollments.reduce((sum, e) => sum + (Number(e?.registration_fee || e?.registrationFee || 0) || 0), 0)
                            )}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Monthly Fee:</span>
                            <span className="font-semibold">${formatCurrency(
                              studentDetails.enrollments.reduce((sum, e) => sum + (Number(e?.monthly_fee || e?.monthlyFee || 0) || 0), 0)
                            )}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Additional Charges:</span>
                            <span className="font-semibold">${formatCurrency(
                              studentDetails.enrollments.reduce((sum, e) => sum + (Number(e?.additional_charges || e?.additionalCharges || 0) || 0), 0)
                            )}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Discount:</span>
                            <span className="font-semibold text-danger">-${formatCurrency(
                              studentDetails.enrollments.reduce((sum, e) => sum + (Number(e?.discount || 0) || 0), 0)
                            )}</span>
                          </div>
                          <div className="col-span-2 flex justify-between border-t border-accent/30 pt-2 mt-2">
                            <span className="font-bold text-accent">Grand Total Due:</span>
                            <span className="font-bold text-success text-lg">${formatCurrency(
                              studentDetails.enrollments.reduce((sum, e) => {
                                const regFee = Number(e?.registration_fee || e?.registrationFee || 0) || 0;
                                const monthlyFee = Number(e?.monthly_fee || e?.monthlyFee || 0) || 0;
                                const addCharges = Number(e?.additional_charges || e?.additionalCharges || 0) || 0;
                                const discount = Number(e?.discount || 0) || 0;
                                return sum + Math.max(0, regFee + monthlyFee + addCharges - discount);
                              }, 0)
                            )}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sport-wise Breakdown */}
                      <div className="space-y-2 text-sm">
                        <h5 className="font-semibold text-muted text-xs uppercase tracking-wider">Sport-wise Breakdown</h5>
                        {studentDetails.enrollments.map((enrollment, idx) => {
                          const enrollmentId = enrollment?.enrollment_id || enrollment?.id || idx;
                          const regFee = parseFloat(enrollment?.registration_fee || enrollment?.registrationFee || 0) || 0;
                          const monthlyFee = parseFloat(enrollment?.monthly_fee || enrollment?.monthlyFee || 0) || 0;
                          const addCharges = parseFloat(enrollment?.additional_charges || enrollment?.additionalCharges || 0) || 0;
                          const discount = parseFloat(enrollment?.discount || 0) || 0;
                          const netDue = Math.max(0, regFee + monthlyFee + addCharges - discount);
                          const sportName = typeof enrollment?.sport === 'string' 
                            ? enrollment.sport 
                            : (enrollment?.sport?.name || enrollment?.sport || 'Unassigned');
                          
                          return (
                            <div key={enrollmentId} className="border-b pb-2 last:border-0">
                              <p className="font-semibold">{sportName}</p>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <span>Registration: ${formatCurrency(regFee)}</span>
                                <span>Monthly: ${formatCurrency(monthlyFee)}</span>
                                <span>Additional: ${formatCurrency(addCharges)}</span>
                                <span>Discount: -${formatCurrency(discount)}</span>
                                <span className="col-span-2 font-bold text-success">Net Due: ${formatCurrency(netDue)}</span>
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
                <div className="mt-4 p-4 rounded-lg border bg-muted/10 border-muted/20">
                  <h4 className="mb-3 font-bold">Attendance Summary</h4>
                  <p className="text-muted">Attendance data not available in current view</p>
                </div>
                <div className="mt-4 p-4 rounded-lg border bg-muted/10 border-muted/20">
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
            <h3 className="mb-4 font-bold">Active Students</h3>
            {loading ? (
              <Loader />
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted text-xs uppercase font-bold tracking-wider">
                    <th className="pb-3">Name</th>
                    <th className="pb-3 px-2">Sports</th>
                    <th className="pb-3 px-2">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="pb-3 px-2">Fees</th>
                    <th className="pb-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted text-xs">No active students found.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const regFee = parseFloat(student?.registration_fee || student?.registrationFee || 0);
                      const addFee = parseFloat(student?.additional_charges || student?.additionalCharges || 0);
                      const disc = parseFloat(student?.discount || 0);
                      const totalOutstanding = Math.max(0, (regFee + addFee) - disc);
                      const feeStatusLabel = totalOutstanding > 0 ? 'Unpaid' : 'Paid';

                      return (
                        <motion.tr
                          key={student.student_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                          className="text-foreground"
                          onClick={() => handleStudentClick(student)}
                        >
                          <td>
                            <div
                              className="cursor-pointer hover:text-accent hover:underline transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForView(student);
                              }}
                            >
                              <p className="font-semibold">{student.name}</p>
                              {student.parent_email && (
                                <p className="text-xs text-muted">{student.parent_email}</p>
                              )}
                            </div>
                          </td>
                          <td>
                            {student.enrollments && Array.isArray(student.enrollments) && student.enrollments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(student.enrollments || []).map((enrollment) => (
                                  <span key={enrollment?.enrollment_id || enrollment?.id} className="rounded bg-success/10 px-2 py-0.5 text-xs text-success border border-success/20">
                                    {enrollment?.sport?.name || enrollment?.sport || '—'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>{student?.sport?.name || student?.sport || '—'}</span>
                            )}
                          </td>
                          <td className="text-muted">{student.batch?.name || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {student.status?.toUpperCase() === 'ACTIVE' || student.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50 tracking-wide uppercase">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/50 tracking-wide uppercase">
                                INACTIVE
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`rounded px-2 py-0.5 text-xs font-bold ${feeStatusLabel === 'Paid' ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                              {feeStatusLabel}
                            </span>
                          </td>
                        <td className="space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="btn-secondary btn-sm border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleStudentClick(student)}>
                            Profile
                          </button>
                          {student.status?.toUpperCase() === 'ACTIVE' || student.isActive ? (
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleDeactivate(student.student_id)}>
                              Deactivate
                            </button>
                          ) : (
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkActive(student.student_id)}>
                              Mark Active
                            </button>
                          )}
                          <button type="button" className="btn-danger btn-sm" onClick={() => handleRemove(student.student_id)}>
                            Remove
                          </button>
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
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-premiumModal">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Add New Student</h3>
              <div className="flex gap-2">
                {draftSavedAt && (
                  <span className="text-xs text-muted">Draft saved</span>
                )}
                <button type="button" className="text-muted hover:text-foreground" onClick={() => setShowAddStudentModal(false)}>
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="label" htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className="input-field"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="middleName">Middle Name (Optional)</label>
                  <input
                    id="middleName"
                    type="text"
                    className="input-field"
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="input-field"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="studentAge">Age</label>
                  <input id="studentAge" name="age" type="number" min={1} max={100} className="input-field" value={form.age} onChange={updateField} required />
                </div>
                <div>
                  <label className="label" htmlFor="studentGender">Gender</label>
                  <select id="studentGender" name="gender" className="input-field" value={form.gender} onChange={updateField} required>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="studentPhone">Phone</label>
                  <input id="studentPhone" name="phone" type="tel" className="input-field" value={form.phone} onChange={updateField} />
                </div>
                <div>
                  <label className="label" htmlFor="joiningDate">Joining Date</label>
                  <input id="joiningDate" name="joining_date" type="date" className="input-field" value={form.joining_date} onChange={updateField} />
                </div>
              </div>
              <div className="mb-4 mt-4">
                <label className="label" htmlFor="studentBlood">Blood Group</label>
                <select id="studentBlood" name="blood_group" className="input-field" value={form.blood_group} onChange={updateField}>
                  <option value="">Select…</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="label" htmlFor="parentName">Parent Name</label>
                <input id="parentName" name="parent_name" className="input-field" value={form.parent_name} onChange={updateField} />
              </div>
              <div className="mb-4">
                <label className="label" htmlFor="parentEmail">Parent Email</label>
                <input id="parentEmail" name="parent_email" type="email" className="input-field" value={form.parent_email} onChange={updateField} required />
              </div>
              <div className="mb-4">
                <label className="label" htmlFor="parentPhone">Parent Phone</label>
                <input id="parentPhone" name="parent_phone" type="tel" className="input-field" value={form.parent_phone} onChange={updateField} />
              </div>
              <div className="relative">
                <label className="label">Sports Selection</label>
                <button
                  type="button"
                  className="input-field flex justify-between items-center text-left w-full bg-background border"
                  onClick={() => setIsSportsDropdownOpen(!isSportsDropdownOpen)}
                >
                  <span className="truncate text-sm">
                    {selectedSports.length === 0
                      ? "Select sports..."
                      : sports
                          ?.filter((s) => selectedSports.includes(s.id || s.sport_id))
                          ?.map((s) => s.name)
                          ?.join(", ")}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">▼</span>
                </button>

                {isSportsDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border p-2 shadow-lg bg-surface border-border">
                    {sports && sports.length > 0 ? (
                      sports.map((sport) => {
                        const sportId = sport.id || sport.sport_id;
                        const isChecked = selectedSports.includes(sportId);
                        return (
                          <label
                            key={sportId}
                            className="flex items-center space-x-3 p-2 rounded-md hover:bg-surface-secondary cursor-pointer text-sm w-full"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-border text-primary h-4 w-4"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedSports(selectedSports.filter((id) => id !== sportId));
                                } else {
                                  setSelectedSports([...selectedSports, sportId]);
                                }
                              }}
                            />
                            <span className="font-medium text-foreground">{sport.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs p-2 text-muted-foreground text-center">No sports configured.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="durationPlan">Duration Plan</label>
                  <select id="durationPlan" name="duration_plan_id" className="input-field" value={form.duration_plan_id} onChange={updateField}>
                    <option value="">Select plan…</option>
                    {(durationPlans || []).map((p) => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.name} ({p.duration_months} months) - {p.multiplier}x
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="studentBatch">Batch (sport · active · seats)</label>
                  <select
                    id="studentBatch"
                    name="batch_id"
                    className="input-field"
                    value={form.batch_id}
                    onChange={updateField}
                    disabled={!selectedSports || selectedSports.length === 0}
                  >
                    <option value="">
                      {!selectedSports || selectedSports.length === 0 ? 'Select sport first…' : (availableBatches || []).length ? 'Select batch…' : 'No batches with seats'}
                    </option>
                    {(availableBatches || []).map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.name}
                        {b.timing ? ` · ${b.timing}` : ''}
                        {b.max_capacity != null
                          ? ` · ${b.available_seats ?? 0}/${b.max_capacity} seats`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="registrationFee">Registration Fee</label>
                  <input id="registrationFee" name="registration_fee" type="number" min={0} step={0.01} className="input-field" value={form.registration_fee} onChange={updateField} placeholder="0" />
                </div>
                <div>
                  <label className="label" htmlFor="additionalCharges">Additional Charges</label>
                  <input id="additionalCharges" name="additional_charges" type="number" min={0} step={0.01} className="input-field" value={form.additional_charges} onChange={updateField} placeholder="0" />
                </div>
                <div>
                  <label className="label" htmlFor="discount">Discount</label>
                  <input id="discount" name="discount" type="number" min={0} step={0.01} className="input-field" value={form.discount} onChange={updateField} placeholder="0" />
                </div>
              </div>

              {/* Live Fee Preview Card */}
              <div className="mt-4 rounded-lg border-2 border-accent/20 bg-accent/10 p-4">
                <h4 className="mb-3 font-bold text-accent">Live Fee Preview</h4>
                <div className="space-y-2 text-sm text-foreground">
                  <div className="flex justify-between">
                    <span>Sports Base Fee:</span>
                    <span className="font-semibold">${formatCurrency(calculateLiveFee().totalSportsFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plan Multiplier:</span>
                    <span className="font-semibold">{calculateLiveFee().multiplier}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sports Fee (with multiplier):</span>
                    <span className="font-semibold">${formatCurrency(calculateLiveFee().sportsFeeWithMultiplier)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration Fee:</span>
                    <span className="font-semibold">${formatCurrency(calculateLiveFee().registrationFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional Charges:</span>
                    <span className="font-semibold">${formatCurrency(calculateLiveFee().additionalCharges)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-semibold text-danger">-${formatCurrency(calculateLiveFee().discount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-accent/20 pt-2">
                    <span className="font-bold">Final Fee:</span>
                    <span className="font-bold text-success text-lg">${formatCurrency(calculateLiveFee().finalFee)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="submit" className="btn-primary flex-1">Enroll Student</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="card max-w-md animate-premiumModal">
            <h3 className="mb-2 font-bold">Clear form?</h3>
            <p className="mb-4 text-sm text-muted">This removes the saved draft and resets all fields.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-danger flex-1" onClick={() => { clearDraft(); setShowClearConfirm(false); }}>
                Yes, clear
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="card max-w-lg w-full animate-premiumModal">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Bulk Import Students (CSV)</h3>
              <button type="button" className="text-muted hover:text-foreground" onClick={() => setShowBulkUpload(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleBulkUpload}>
              <div className="mb-4">
                <button
                  type="button"
                  className="text-sm text-emerald-600 hover:text-emerald-800 underline mb-2 transition-colors"
                  onClick={downloadSampleCSV}
                >
                  Download Sample Template
                </button>
                <label className="label" htmlFor="csvFile">Select CSV File</label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  className="input-field"
                  onChange={(e) => setBulkUploadFile(e.target.files[0])}
                  required
                />
                <p className="mt-2 text-xs text-muted">
                  CSV should include headers: first_name, last_name, phone, parent_name, parent_email, gender, age
                </p>
              </div>
              {bulkUploadResults && (
                <div className="mb-4 rounded bg-muted p-3">
                  <p className="font-semibold">Upload Results:</p>
                  <p className="text-sm text-success">Success: {bulkUploadResults.success_count}</p>
                  <p className="text-sm text-error">Errors: {bulkUploadResults.error_count}</p>
                  {bulkUploadResults.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold">View Errors</summary>
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
                <button type="submit" className="btn-primary flex-1">Upload</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowBulkUpload(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-premiumModal">
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
                <button type="button" className="text-muted hover:text-foreground" onClick={() => setShowStudentModal(false)}>
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
                  className={`px-4 py-2 capitalize transition-all duration-300 ${modalTab === tab ? 'border-b-2 border-emerald-700 font-semibold text-emerald-800 bg-emerald-50 rounded-t-lg' : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'}`}
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
                    {isEditingStudent ? (
                      <form onSubmit={handleUpdateStudent} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="label" htmlFor="editName">Full Name</label>
                            <input
                              id="editName"
                              type="text"
                              className="input-field"
                              value={editStudentForm.name}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editEmail">Parent Email</label>
                            <input
                              id="editEmail"
                              type="email"
                              className="input-field"
                              value={editStudentForm.parent_email}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_email: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editPhone">Phone</label>
                            <input
                              id="editPhone"
                              type="tel"
                              className="input-field"
                              value={editStudentForm.phone}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editAge">Age</label>
                            <input
                              id="editAge"
                              type="number"
                              min={1}
                              max={100}
                              className="input-field"
                              value={editStudentForm.age}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, age: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editGender">Gender</label>
                            <select
                              id="editGender"
                              className="input-field"
                              value={editStudentForm.gender}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, gender: e.target.value })}
                              required
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="label" htmlFor="editBloodGroup">Blood Group</label>
                            <select
                              id="editBloodGroup"
                              className="input-field"
                              value={editStudentForm.blood_group}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, blood_group: e.target.value })}
                            >
                              <option value="">Select…</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label" htmlFor="editParentName">Parent Name</label>
                            <input
                              id="editParentName"
                              type="text"
                              className="input-field"
                              value={editStudentForm.parent_name}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editParentPhone">Parent Phone</label>
                            <input
                              id="editParentPhone"
                              type="tel"
                              className="input-field"
                              value={editStudentForm.parent_phone}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, parent_phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor="editFeesStatus">Fees Status</label>
                            <select
                              id="editFeesStatus"
                              className="input-field"
                              value={editStudentForm.fees_status}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, fees_status: e.target.value })}
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
                            className="input-field flex justify-between items-center text-left w-full bg-background border"
                            onClick={() => setIsSportsDropdownOpen(!isSportsDropdownOpen)}
                          >
                            <span className="truncate text-sm">
                              {editSelectedSports.length === 0
                                ? "Select sports..."
                                : sports
                                    ?.filter((s) => editSelectedSports.includes(s.id || s.sport_id))
                                    ?.map((s) => s.name)
                                    ?.join(", ")}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">▼</span>
                          </button>
                          {isSportsDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border p-2 shadow-lg bg-surface border-border">
                              {sports && sports.length > 0 ? (
                                sports.map((sport) => {
                                  const sportId = sport.id || sport.sport_id;
                                  const isChecked = editSelectedSports.includes(sportId);
                                  return (
                                    <label
                                      key={sportId}
                                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm w-full"
                                    >
                                      <input
                                        type="checkbox"
                                        className="rounded border-zinc-300 dark:border-zinc-700 text-primary h-4 w-4"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setEditSelectedSports(editSelectedSports.filter((id) => id !== sportId));
                                          } else {
                                            setEditSelectedSports([...editSelectedSports, sportId]);
                                          }
                                        }}
                                      />
                                      <span className="font-medium text-foreground">{sport.name}</span>
                                    </label>
                                  );
                                })
                              ) : (
                                <p className="text-xs p-2 text-muted-foreground text-center">No sports configured.</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="label" htmlFor="editDurationPlan">Duration Plan</label>
                            <select
                              id="editDurationPlan"
                              className="input-field"
                              value={editStudentForm.duration_plan_id || ''}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, duration_plan_id: e.target.value })}
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
                            <label className="label" htmlFor="editBatch">Batch</label>
                            <select
                              id="editBatch"
                              className="input-field"
                              value={editStudentForm.batch_id || ''}
                              onChange={(e) => setEditStudentForm({ ...editStudentForm, batch_id: e.target.value })}
                            >
                              <option value="">Select batch…</option>
                              {availableBatches.map((b) => (
                                <option key={b.batch_id} value={b.batch_id}>
                                  {b.name}
                                  {b.timing ? ` · ${b.timing}` : ''}
                                  {b.max_capacity != null
                                    ? ` · ${b.available_seats ?? 0}/${b.max_capacity} seats`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary flex-1">Save Changes</button>
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
                          <label className="text-sm font-semibold text-muted">Full Name</label>
                          <p className="text-lg">{studentDetails.student.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Email</label>
                          <p>{studentDetails.student.parent_email || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Phone</label>
                          <p>{studentDetails.student.phone || studentDetails.student.parent_phone || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Age</label>
                          <p>{studentDetails.student.age || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Gender</label>
                          <p>{normalizeGender(studentDetails.student.gender)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Blood Group</label>
                          <p>{studentDetails.student.blood_group || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Joining Date</label>
                          <p>{studentDetails.student.joining_date ? new Date(studentDetails.student.joining_date).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted">Parent Name</label>
                          <p>{studentDetails.student.parent_name || '—'}</p>
                        </div>
                      </div>
                    )}
                    {studentDetails.enrollments && studentDetails.enrollments.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 font-semibold">Enrollments</h4>
                        <div className="space-y-2">
                          {studentDetails.enrollments.map((enrollment) => (
                            <div key={enrollment.enrollment_id} className="rounded bg-muted p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{enrollment.sport?.name}</span>
                                <span className="text-sm text-muted">{enrollment.duration_plan?.name || 'No plan'}</span>
                              </div>
                              <div className="mt-2 text-sm">
                                <p>Final Fee: ${formatCurrency(enrollment.final_fee)}</p>
                                <p>Next Due: {enrollment.next_due_date ? new Date(enrollment.next_due_date).toLocaleDateString() : '—'}</p>
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
                    <h4 className="mb-3 font-semibold">Payment History</h4>
                    {studentDetails.receipts && studentDetails.receipts.length > 0 ? (
                      <div className="space-y-2">
                        {studentDetails.receipts.map((receipt) => (
                          <div key={receipt.receipt_id} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{receipt.receipt_number}</span>
                              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                receipt.status === 'COMPLETED' ? 'bg-success/15 text-success' : 
                                receipt.status === 'PENDING' ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'
                              }`}>
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
                      <p className="text-center text-muted">No payment records found.</p>
                    )}
                  </div>
                )}
                
                {/* Attendance History Tab */}
                {modalTab === 'attendance' && (
                  <div>
                    <h4 className="mb-3 font-semibold">Attendance History</h4>
                    {studentDetails.attendance && studentDetails.attendance.length > 0 ? (
                      <div className="space-y-2">
                        {studentDetails.attendance.map((record) => (
                          <div key={record.attendance_id} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{new Date(record.date).toLocaleDateString()}</span>
                              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                record.status === 'PRESENT' ? 'bg-success/15 text-success' : 
                                record.status === 'ABSENT' ? 'bg-error/15 text-error' : 
                                record.status === 'LATE' ? 'bg-warning/15 text-warning' : 'bg-muted'
                              }`}>
                                {record.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm">
                              <p>Batch: {record.batch?.name || '—'}</p>
                              {record.remarks && <p>Remarks: {record.remarks}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted">No attendance records found.</p>
                    )}
                  </div>
                )}
                
                {/* Performance Scores Tab */}
                {modalTab === 'performance' && (
                  <div>
                    <h4 className="mb-3 font-semibold">Performance Scores</h4>
                    {studentDetails.performance_scores && studentDetails.performance_scores.length > 0 ? (
                      <div className="space-y-4">
                        {studentDetails.performance_scores.map((score) => (
                          <div key={score.score_id} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{score.attribute?.name}</span>
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
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
                      <p className="text-center text-muted">No performance scores found.</p>
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
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">{new Date(note.note_date).toLocaleDateString()}</span>
                              <span className="text-xs text-muted">
                                Coach: {note.coach?.name || '—'}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              {note.performance_notes && (
                                <div>
                                  <span className="font-medium text-accent">Performance:</span>
                                  <p className="mt-1">{note.performance_notes}</p>
                                </div>
                              )}
                              {note.behaviour_notes && (
                                <div>
                                  <span className="font-medium text-accent">Behaviour:</span>
                                  <p className="mt-1">{note.behaviour_notes}</p>
                                </div>
                              )}
                              {note.achievements && (
                                <div>
                                  <span className="font-medium text-accent">Achievements:</span>
                                  <p className="mt-1">{note.achievements}</p>
                                </div>
                              )}
                              {note.improvement_areas && (
                                <div>
                                  <span className="font-medium text-accent">Improvement Areas:</span>
                                  <p className="mt-1">{note.improvement_areas}</p>
                                </div>
                              )}
                              {note.emailed_at && (
                                <p className="text-xs text-muted mt-2">
                                  Emailed to parent: {new Date(note.emailed_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted">No daily notes found.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted">Failed to load student details.</p>
            )}
          </div>
        </div>
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudentForView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface w-full max-w-xl rounded-xl shadow-xl overflow-hidden border border-border animate-fadeIn">
            <div className="bg-accent px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold">Detailed Student Profile</h3>
              <button
                onClick={() => setSelectedStudentForView(null)}
                className="text-white hover:text-gray-200 font-bold text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm max-h-[75vh] overflow-y-auto">
              <div className="col-span-2 border-b pb-2 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Personal Information</h4>
              </div>
              <div><span className="font-semibold text-muted block">Full Name:</span> {selectedStudentForView?.name || `${selectedStudentForView?.firstName || ''} ${selectedStudentForView?.middleName || ''} ${selectedStudentForView?.lastName || ''}`}</div>
              <div><span className="font-semibold text-muted block">Age / Gender:</span> {selectedStudentForView?.age || '—'} years / {normalizeGender(selectedStudentForView?.gender)}</div>
              <div><span className="font-semibold text-muted block">Blood Group:</span> {selectedStudentForView?.blood_group || selectedStudentForView?.bloodGroup || 'Not Provided'}</div>
              <div><span className="font-semibold text-muted block">Joining Date:</span> {selectedStudentForView?.joining_date ? new Date(selectedStudentForView.joining_date).toLocaleDateString() : '—'}</div>

              <div className="col-span-2 border-b pb-2 mt-4 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Parent / Guardian Details</h4>
              </div>
              <div><span className="font-semibold text-muted block">Parent Name:</span> {selectedStudentForView?.parent_name || '—'}</div>
              <div><span className="font-semibold text-muted block">Parent Phone:</span> {selectedStudentForView?.parent_phone || '—'}</div>
              <div className="col-span-2"><span className="font-semibold text-muted block">Parent Email:</span> {selectedStudentForView?.parent_email || '—'}</div>

              <div className="col-span-2 border-b pb-2 mt-4 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Academy Enrollment Settings</h4>
              </div>
              <div><span className="font-semibold text-muted block">Assigned Sport:</span> {selectedStudentForView?.sport?.name || selectedStudentForView?.sports || '—'}</div>
              <div><span className="font-semibold text-muted block">Batch Schedule:</span> {selectedStudentForView?.batch?.name || 'Unassigned'}</div>
              <div><span className="font-semibold text-muted block">Fees Milestone Status:</span> <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedStudentForView?.fees_status === 'paid' ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>{selectedStudentForView?.fees_status || '—'}</span></div>

              {(() => {
                console.log("Selected Student Data Object:", selectedStudentForView);
                const activeEnrollments = selectedStudentForView?.enrollments?.filter(e => e.is_active) || [];
                const latestEnrollment = activeEnrollments.length > 0 ? activeEnrollments[0] : null;

                // Dynamic multiplier sync with duration plans
                const globalDurationPlans = durationPlans || [];
                const currentStudentPlan = latestEnrollment?.duration_plan?.name || selectedStudentForView?.duration_plan || selectedStudentForView?.durationPlan || "";
                
                // Relational array matching
                const exactPlanMatch = globalDurationPlans.find(p => p.name === currentStudentPlan || p._id === currentStudentPlan || p.id === currentStudentPlan || p.plan_id === currentStudentPlan);
                
                // Resolve dynamic multiplier coefficient
                const dynamicMultiplier = exactPlanMatch ? parseFloat(exactPlanMatch.multiplier) : parseFloat(latestEnrollment?.duration_plan?.multiplier || latestEnrollment?.plan_multiplier || latestEnrollment?.planMultiplier || 1);
                
                const rawBaseSportsFee = parseFloat(latestEnrollment?.sports_base_fee || latestEnrollment?.sportsBaseFee || latestEnrollment?.sports_fee || 0);
                const totalMultipliedSportsFee = rawBaseSportsFee * dynamicMultiplier;

                const regFeeAmount = parseFloat(latestEnrollment?.registration_fee || 0);
                const additionalSurchargesAmount = parseFloat(latestEnrollment?.additional_charges || 0);
                const appliedDiscountAmount = parseFloat(latestEnrollment?.discount || 0);

                const accurateTotalComputedFee = totalMultipliedSportsFee + regFeeAmount + additionalSurchargesAmount - appliedDiscountAmount;

                const dynamicAmountPaidFromLedger = parseFloat(selectedStudentForView?.amount_paid || selectedStudentForView?.amountPaid || 0);
                const finalOutstandingDuesBalance = Math.max(0, accurateTotalComputedFee - dynamicAmountPaidFromLedger);
                const conditionalFeeStatusString = finalOutstandingDuesBalance > 0 ? 'UNPAID' : 'PAID';

                const durationPlanName = latestEnrollment?.duration_plan?.name || selectedStudentForView?.duration_plan || selectedStudentForView?.durationPlan || 'Standard';

                return (
                  <div className="col-span-2 border-t pt-3 mt-2 bg-surface-secondary p-3 rounded-lg border border-border text-xs space-y-1">
                    <span className="font-bold text-muted uppercase tracking-wider block mb-1">Financial Ledger Summary</span>
                    <div className="space-y-2 border-t pt-3 mt-2 text-sm text-foreground">
                      <div className="flex justify-between">
                        <span>Sports Base Fee:</span>
                        <span className="font-medium">${formatCurrency(rawBaseSportsFee)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted pl-2">
                        <span>Plan Multiplier / Duration:</span>
                        <span className="font-medium">{Number.isFinite(Number(dynamicMultiplier)) ? Number(dynamicMultiplier).toFixed(1) : '1.0'}x ({durationPlanName})</span>
                      </div>
                      <div className="flex justify-between font-medium text-foreground bg-surface-secondary p-1 rounded transition-all duration-300 ease-in-out">
                        <span>Sports Fee (with multiplier):</span>
                        <span>${formatCurrency(totalMultipliedSportsFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Registration Fee:</span>
                        <span>${formatCurrency(regFeeAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional Surcharges:</span>
                        <span>${formatCurrency(additionalSurchargesAmount)}</span>
                      </div>
                      <div className="flex justify-between text-danger">
                        <span>Applied Discount:</span>
                        <span>-${formatCurrency(appliedDiscountAmount)}</span>
                      </div>

                      <div className="flex justify-between border-t pt-2 mt-2 font-semibold text-foreground bg-surface-secondary p-1.5 rounded transition-all duration-300 ease-in-out">
                        <span>Total Computed Fee (Decided):</span>
                        <span>${formatCurrency(accurateTotalComputedFee)}</span>
                      </div>
                      <div className="flex justify-between text-success font-medium transition-all duration-300 ease-in-out">
                        <span>Amount Paid (Accounts Section):</span>
                        <span>-${formatCurrency(dynamicAmountPaidFromLedger)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span>Total Balance Due:</span>
                        <span className={finalOutstandingDuesBalance > 0 ? "text-danger" : "text-success"}>
                          ${formatCurrency(finalOutstandingDuesBalance)} ({conditionalFeeStatusString})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
