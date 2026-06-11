import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { useFormDraft } from '../../hooks/useFormDraft';
import { adminDelete, adminGet, adminPost } from '../../api/client';

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
    
    selectedSportIds.forEach(sportId => {
      const sport = sports.find(s => String(s.sport_id) === String(sportId));
      if (sport) {
        totalSportsFee += parseFloat(sport.base_fee) || 0;
      }
    });

    const durationPlan = durationPlans.find(p => String(p.plan_id) === String(form.duration_plan_id));
    const multiplier = durationPlan ? parseFloat(durationPlan.multiplier) : 1;
    
    const sportsFeeWithMultiplier = totalSportsFee * multiplier;
    const registrationFee = parseFloat(form.registration_fee) || 0;
    const additionalCharges = parseFloat(form.additional_charges) || 0;
    const discount = parseFloat(form.discount) || 0;
    
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

  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
    setModalTab('profile');
    setLoadingDetails(true);
    try {
      const detailsRes = await adminGet(`/admin/students/${student.student_id}/details`);
      setStudentDetails(detailsRes.data);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoadingDetails(false);
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchQuery || 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.first_name && student.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.last_name && student.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.parent_email && student.parent_email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSport = !filterSport || 
      student.sport_id === parseInt(filterSport) ||
      (student.enrollments && student.enrollments.some(e => e.sport_id === parseInt(filterSport)));
    
    const matchesBatch = !filterBatch || student.batch_id === parseInt(filterBatch);
    
    return matchesSearch && matchesSport && matchesBatch;
  });

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Students Registration</h2>
          <p className="text-slate-600">
            Enroll students with multi-sport support, duration plans, and fee management.
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2 border border-slate-200 rounded-md text-slate-700 bg-white hover:bg-slate-100 hover:text-emerald-700 transition-all duration-300"
          onClick={() => setShowBulkUpload(true)}
        >
          Bulk Import (CSV)
        </button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
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
                    <label className="text-sm font-semibold text-muted">Full Name</label>
                    <p className="text-lg">
                      {[
                        studentDetails?.student?.first_name,
                        studentDetails?.student?.middle_name,
                        studentDetails?.student?.last_name
                      ].filter(Boolean).join(' ') || studentDetails?.student?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Age</label>
                    <p>{studentDetails?.student?.age || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Gender</label>
                    <p>{studentDetails?.student?.gender || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Blood Group</label>
                    <p>{studentDetails?.student?.blood_group || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Joining Date</label>
                    <p>{studentDetails?.student?.joining_date ? new Date(studentDetails.student.joining_date).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted">Phone</label>
                    <p>{studentDetails?.student?.phone || '—'}</p>
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
                </div>
                {studentDetails?.enrollments && studentDetails.enrollments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 font-semibold">Enrollments</h4>
                    <div className="space-y-2">
                      {studentDetails.enrollments.map((enrollment) => (
                        <div key={enrollment?.enrollment_id} className="rounded bg-muted p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {typeof enrollment?.sport === 'string' ? enrollment.sport : (enrollment?.sport?.name || 'Unassigned')}
                            </span>
                            <span className="text-sm text-muted">
                              {typeof enrollment?.batch === 'string' ? enrollment.batch : (enrollment?.batch?.name || 'N/A')}
                            </span>
                          </div>
                          <div className="mt-2 text-sm">
                            <p>Duration Plan: {enrollment?.duration_plan?.name || 'No plan'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 p-4 rounded-lg border bg-emerald-50 border-emerald-100">
                  <h4 className="mb-3 font-bold text-emerald-800">Financial Accounts Matrix</h4>
                  {studentDetails?.enrollments && studentDetails.enrollments.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {studentDetails.enrollments.map((enrollment) => {
                        const regFee = parseFloat(enrollment?.registration_fee || enrollment?.registrationFee || 0);
                        const addCharges = parseFloat(enrollment?.additional_charges || enrollment?.additionalCharges || 0);
                        const discount = parseFloat(enrollment?.discount || 0);
                        const netDue = Math.max(0, (regFee + addCharges) - discount);
                        return (
                          <div key={enrollment?.enrollment_id} className="border-b pb-2 last:border-0">
                            <p className="font-semibold">
                              {typeof enrollment?.sport === 'string' ? enrollment.sport : (enrollment?.sport?.name || 'Unassigned')}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <span>Registration: ${regFee.toFixed(2)}</span>
                              <span>Additional: ${addCharges.toFixed(2)}</span>
                              <span>Discount: -${discount.toFixed(2)}</span>
                              <span className="font-bold text-emerald-700">Net Due: ${netDue.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted">No enrollment data available</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted">No student details available</p>
            )}
          </div>
        ) : (
          <form className="card hover:-translate-y-[1px] hover:shadow-md transition-all duration-300" onSubmit={handleSubmit}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Add New Student</h3>
              {draftSavedAt && (
                <span className="text-xs text-muted">Draft saved</span>
              )}
            </div>
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
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border p-2 shadow-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                {sports && sports.length > 0 ? (
                  sports.map((sport) => {
                    const sportId = sport.id || sport.sport_id;
                    const isChecked = selectedSports.includes(sportId);
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
                {durationPlans.map((p) => (
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
                  {!selectedSports || selectedSports.length === 0 ? 'Select sport first…' : availableBatches.length ? 'Select batch…' : 'No batches with seats'}
                </option>
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
          <div className="mt-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
            <h4 className="mb-3 font-bold text-emerald-800">Live Fee Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sports Base Fee:</span>
                <span className="font-semibold">${calculateLiveFee().totalSportsFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Plan Multiplier:</span>
                <span className="font-semibold">{calculateLiveFee().multiplier}x</span>
              </div>
              <div className="flex justify-between">
                <span>Sports Fee (with multiplier):</span>
                <span className="font-semibold">${calculateLiveFee().sportsFeeWithMultiplier.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Registration Fee:</span>
                <span className="font-semibold">${calculateLiveFee().registrationFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Additional Charges:</span>
                <span className="font-semibold">${calculateLiveFee().additionalCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-semibold text-red-600">-${calculateLiveFee().discount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-emerald-200 pt-2">
                <span className="font-bold">Final Fee:</span>
                <span className="font-bold text-emerald-700 text-lg">${calculateLiveFee().finalFee.toFixed(2)}</span>
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
        )}
        <div className="card overflow-x-auto hover:-translate-y-[1px] hover:shadow-md transition-all duration-300">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold">Active Students</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search students..."
                className="input-field sm:w-48"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="input-field sm:w-40"
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value)}
              >
                <option value="">All Sports</option>
                {sports.map((s) => (
                  <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
                ))}
              </select>
              <select
                className="input-field sm:w-40"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {availableBatches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sports</th>
                  <th>Batch</th>
                  <th>Fees</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">No active students found.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const regFee = parseFloat(student?.registration_fee || student?.registrationFee || 0);
                    const addFee = parseFloat(student?.additional_charges || student?.additionalCharges || 0);
                    const disc = parseFloat(student?.discount || 0);
                    const totalOutstanding = Math.max(0, (regFee + addFee) - disc);
                    const feeStatusLabel = totalOutstanding > 0 ? 'Unpaid' : 'Paid';

                    return (
                      <tr
                        key={student.student_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td>
                          <div
                            className="cursor-pointer hover:text-emerald-600 hover:underline transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForView(student);
                            }}
                          >
                            <p className="font-semibold">{student.name}</p>
                            {student.parent_email && (
                              <p className="text-xs text-gray-500">{student.parent_email}</p>
                            )}
                          </div>
                        </td>
                        <td>
                          {student.enrollments && student.enrollments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {student.enrollments.map((enrollment) => (
                                <span key={enrollment.enrollment_id} className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                  {enrollment.sport?.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{student.sport?.name || '—'}</span>
                          )}
                        </td>
                        <td>{student.batch?.name || '—'}</td>
                        <td>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${feeStatusLabel === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {feeStatusLabel}
                          </span>
                        </td>
                      <td className="space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleExit(student.student_id)}>
                          Exit
                        </button>
                        <button type="button" className="btn-danger btn-sm" onClick={() => handleRemove(student.student_id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
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
              <button type="button" className="text-muted hover:text-foreground" onClick={() => setShowStudentModal(false)}>
                ✕
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="mb-4 flex gap-2 border-b">
              {['profile', 'accounts', 'attendance', 'performance'].map((tab) => (
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
                        <p>{studentDetails.student.gender || '—'}</p>
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
                                <p>Final Fee: ${enrollment.final_fee?.toFixed(2) || '0'}</p>
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
                              <p>Amount: ${receipt.amount?.toFixed(2) || '0'}</p>
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
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl overflow-hidden border border-gray-100 animate-fadeIn">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Personal Information</h4>
              </div>
              <div><span className="font-semibold text-gray-500 block">Full Name:</span> {selectedStudentForView?.name || `${selectedStudentForView?.firstName || ''} ${selectedStudentForView?.middleName || ''} ${selectedStudentForView?.lastName || ''}`}</div>
              <div><span className="font-semibold text-gray-500 block">Age / Gender:</span> {selectedStudentForView?.age || '—'} years / {selectedStudentForView?.gender || '—'}</div>
              <div><span className="font-semibold text-gray-500 block">Blood Group:</span> {selectedStudentForView?.blood_group || selectedStudentForView?.bloodGroup || 'Not Provided'}</div>
              <div><span className="font-semibold text-gray-500 block">Joining Date:</span> {selectedStudentForView?.joining_date ? new Date(selectedStudentForView.joining_date).toLocaleDateString() : '—'}</div>

              <div className="col-span-2 border-b pb-2 mt-4 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Parent / Guardian Details</h4>
              </div>
              <div><span className="font-semibold text-gray-500 block">Parent Name:</span> {selectedStudentForView?.parent_name || '—'}</div>
              <div><span className="font-semibold text-gray-500 block">Parent Phone:</span> {selectedStudentForView?.parent_phone || '—'}</div>
              <div className="col-span-2"><span className="font-semibold text-gray-500 block">Parent Email:</span> {selectedStudentForView?.parent_email || '—'}</div>

              <div className="col-span-2 border-b pb-2 mt-4 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Academy Enrollment Settings</h4>
              </div>
              <div><span className="font-semibold text-gray-500 block">Assigned Sport:</span> {selectedStudentForView?.sport?.name || selectedStudentForView?.sports || '—'}</div>
              <div><span className="font-semibold text-gray-500 block">Batch Schedule:</span> {selectedStudentForView?.batch?.name || 'Unassigned'}</div>
              <div><span className="font-semibold text-gray-500 block">Fees Milestone Status:</span> <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedStudentForView?.fees_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedStudentForView?.fees_status || '—'}</span></div>

              {(() => {
                console.log("Selected Student Data Object:", selectedStudentForView);
                const activeEnrollments = selectedStudentForView?.enrollments?.filter(e => e.is_active) || [];
                const latestEnrollment = activeEnrollments.length > 0 ? activeEnrollments[0] : null;

                const baseSportsFee = parseFloat(latestEnrollment?.sports_base_fee || latestEnrollment?.sportsBaseFee || latestEnrollment?.sports_fee || 0);
                const planMultiplierValue = parseFloat(latestEnrollment?.plan_multiplier || latestEnrollment?.planMultiplier || 1);

                const calculatedSportsFeeWithMultiplier = parseFloat(latestEnrollment?.sports_fee_calculated || latestEnrollment?.sportsFeeCalculated || (baseSportsFee * planMultiplierValue));

                const regFeeAmount = parseFloat(latestEnrollment?.registration_fee || 0);
                const additionalSurchargesAmount = parseFloat(latestEnrollment?.additional_charges || 0);
                const appliedDiscountAmount = parseFloat(latestEnrollment?.discount || 0);

                const accurateTotalComputedFee = calculatedSportsFeeWithMultiplier + regFeeAmount + additionalSurchargesAmount - appliedDiscountAmount;

                const dynamicAmountPaidFromLedger = parseFloat(selectedStudentForView?.amount_paid || selectedStudentForView?.amountPaid || 0);
                const finalOutstandingDuesBalance = Math.max(0, accurateTotalComputedFee - dynamicAmountPaidFromLedger);
                const conditionalFeeStatusString = finalOutstandingDuesBalance > 0 ? 'UNPAID' : 'PAID';

                const durationPlanName = latestEnrollment?.duration_plan?.name || selectedStudentForView?.duration_plan || selectedStudentForView?.durationPlan || 'Standard';

                return (
                  <div className="col-span-2 border-t pt-3 mt-2 bg-zinc-50 p-3 rounded-lg border text-xs space-y-1">
                    <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">Financial Ledger Summary</span>
                    <div className="space-y-2 border-t pt-3 mt-2 text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span>Sports Base Fee:</span>
                        <span className="font-medium">${baseSportsFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 pl-2">
                        <span>Plan Multiplier / Duration:</span>
                        <span className="font-medium">{planMultiplierValue.toFixed(1)}x ({durationPlanName})</span>
                      </div>
                      <div className="flex justify-between font-medium text-gray-800 bg-gray-50/50 p-1 rounded">
                        <span>Sports Fee (with multiplier):</span>
                        <span>${calculatedSportsFeeWithMultiplier.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Registration Fee:</span>
                        <span>${regFeeAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional Surcharges:</span>
                        <span>${additionalSurchargesAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>Applied Discount:</span>
                        <span>-${appliedDiscountAmount.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between border-t pt-2 mt-2 font-semibold text-gray-900 bg-gray-50 p-1.5 rounded">
                        <span>Total Computed Fee (Decided):</span>
                        <span>${accurateTotalComputedFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Amount Paid (Accounts Section):</span>
                        <span>-${dynamicAmountPaidFromLedger.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span>Total Balance Due:</span>
                        <span className={finalOutstandingDuesBalance > 0 ? "text-red-600" : "text-green-600"}>
                          ${finalOutstandingDuesBalance.toFixed(2)} ({conditionalFeeStatusString})
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
    </div>
  );
}
