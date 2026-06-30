import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

const emptyReceiptForm = {
  student_id: '',
  amount_paid: '',
  discount: '',
  additional_charges: '',
  payment_method: 'cash',
  payment_date: new Date().toISOString().split('T')[0],
};

export default function AccountsPanel() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('create');
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [durationPlans, setDurationPlans] = useState([]);
  const [receiptForm, setReceiptForm] = useState(emptyReceiptForm);
  const [studentLedger, setStudentLedger] = useState(null);
  const [pendingFee, setPendingFee] = useState(null);
  const [pendingAmount, setPendingAmount] = useState(null);
  const [pendingDues, setPendingDues] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
      case 'student_id':
        if (!value) {
          error = 'Student is required';
        }
        break;
      case 'amount_paid':
        if (!value || value.trim() === '') {
          error = 'Amount paid is required';
        } else if (isNaN(value) || parseFloat(value) < 0) {
          error = 'Amount paid must be a valid positive number';
        }
        break;
      case 'additional_charges':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          error = 'Additional charges must be a valid positive number';
        }
        break;
      case 'discount':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          error = 'Discount must be a valid positive number';
        }
        break;
      case 'payment_date':
        if (!value) {
          error = 'Payment date is required';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, receiptsRes, pendingDuesRes, revenueSummaryRes, durationPlansRes] =
        await Promise.all([
          adminGet('/admin/students'),
          adminGet('/admin/accounts/receipts'),
          adminGet('/admin/accounts/pending-dues'),
          adminGet('/admin/accounts/revenue-summary'),
          adminGet('/admin/duration-plans'),
        ]);
      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      const receiptsData = receiptsRes.data?.data || receiptsRes.data || [];
      setReceipts(Array.isArray(receiptsData) ? receiptsData : []);
      const pendingDuesData = pendingDuesRes.data?.data || pendingDuesRes.data || [];
      setPendingDues(Array.isArray(pendingDuesData) ? pendingDuesData : []);
      const revenueSummaryData = revenueSummaryRes.data?.data || revenueSummaryRes.data || null;
      setRevenueSummary(revenueSummaryData);
      setDurationPlans(durationPlansRes.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
      setReceipts([]);
      setPendingDues([]);
      setRevenueSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  // Pehli baar fetch karega immediately
  loadData();

  // Har 5 second me background me fetch karega automatic sync ke liye
  const interval = setInterval(() => {
    loadData();
  }, 5000);

  // Jab user page se bahar jaye toh interval ko clear karein (Memory Leak Protection)
  return () => clearInterval(interval);
}, []);

  const handleStudentSelection = async (studentId) => {
    console.log('DEBUG: Selected Student ID changed to:', studentId);

    setReceiptForm((prev) => ({ ...prev, student_id: studentId }));
    setHighlightedIndex(-1);

    const selectedStudent = (students || []).find(
      (s) =>
        s?.student_id?.toString() === studentId.toString() ||
        s?.id?.toString() === studentId.toString(),
    );

    if (selectedStudent) {
      setStudentSearchTerm(
        selectedStudent?.name ||
          `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`,
      );
    }

    if (!studentId) {
      setPendingAmount(null);
      setPendingFee(null);
      setStudentLedger(null);
      setStudentSearchTerm('');
      return;
    }

    try {
      const result = await adminGet(`/admin/accounts/student-ledger/${studentId}`);
      if (result && result.data) {
        const remainingAmount =
          result.data.remaining || result.data.balance_outstanding || result.data.pendingFee || 0;
        setPendingFee(remainingAmount);
        setPendingAmount(remainingAmount);
        setStudentLedger(result.data?.data || result.data);
        setReceiptForm((prev) => ({ ...prev, amount_paid: remainingAmount.toString() }));
        return;
      }
    } catch (error) {
      console.warn('Backend ledger route unavailable, using local array fallback...', error);
    }

    if (selectedStudent) {
      // CORRECT DYNAMIC ASSIGNED FEES LOGIC (Kept fully original)
      const activeSelectedStudent = selectedStudent;
      const activeStudentPlan =
        activeSelectedStudent?.duration_plan || activeSelectedStudent?.durationPlan || '';
      const safePlansArray = durationPlans || [];

      // 1. Look up the live duration plan multiplier from the database
      const matchedPlanConfig = safePlansArray.find(
        (p) =>
          p?.name === activeStudentPlan ||
          p?._id === activeStudentPlan ||
          p?.plan_id === activeStudentPlan ||
          p?.id === activeStudentPlan,
      );

      // 2. Resolve multiplier fallback gracefully
      const activeMultiplier = matchedPlanConfig
        ? parseFloat(matchedPlanConfig.multiplier || 1)
        : parseFloat(activeSelectedStudent?.plan_multiplier || 1);

      // 3. Compute accurate full multi-factor fee assigned at registration
      const baseSportsCost = parseFloat(
        activeSelectedStudent?.sports_base_fee || activeSelectedStudent?.sportsBaseFee || 0,
      );
      const finalMultipliedSportsFee = baseSportsCost * activeMultiplier;

      const regFeeAmount = parseFloat(
        activeSelectedStudent?.registration_fee || activeSelectedStudent?.registrationFee || 0,
      );
      const additionalSurchargesAmount = parseFloat(
        activeSelectedStudent?.additional_charges || activeSelectedStudent?.additionalCharges || 0,
      );
      const appliedDiscountAmount = parseFloat(activeSelectedStudent?.discount || 0);

      // Dynamic assigned threshold
      const accurateTotalFeesAssigned =
        finalMultipliedSportsFee +
        regFeeAmount +
        additionalSurchargesAmount -
        appliedDiscountAmount;

      // AGGREGATE TOTAL PAID FEES CORRECTLY
      const aggregatedPayments = (receipts || [])
        .filter(
          (p) =>
            (p.student_id?.toString() === studentId.toString() ||
              p.student?.student_id?.toString() === studentId.toString()) &&
            p.status?.toUpperCase() === 'COMPLETED',
        )
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // ENFORCE LOGICAL CONSTRAINT CAP (Safety Shield)
      const finalFeesPaidDisplayed = Math.min(aggregatedPayments, accurateTotalFeesAssigned);

      // Calculate the true remaining pending balance
      const finalLivePendingDues = Math.max(0, accurateTotalFeesAssigned - finalFeesPaidDisplayed);

      setPendingAmount(finalLivePendingDues);
      setPendingFee(finalLivePendingDues);

      // Update student ledger with corrected values
      setStudentLedger({
        total_fee_due: accurateTotalFeesAssigned,
        total_paid: finalFeesPaidDisplayed,
        balance_outstanding: finalLivePendingDues,
      });

      setReceiptForm((prev) => ({ ...prev, amount_paid: finalLivePendingDues.toString() }));
    } else {
      setPendingAmount(0);
      setPendingFee(0);
      setStudentLedger(null);
    }
  };

  const handleKeyDown = (e) => {
    const filteredStudents = getFilteredStudents();
    if (!dropdownOpen || filteredStudents.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredStudents.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredStudents.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredStudents[highlightedIndex]) {
          const student = filteredStudents[highlightedIndex];
          const studentId = student?.student_id || student?.id;
          setReceiptForm({ ...receiptForm, student_id: studentId });
          setStudentSearchTerm(student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`);
          setDropdownOpen(false);
          setHighlightedIndex(-1);
          handleStudentSelection(studentId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearchTerm) return [];
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
      const parentName = s?.parent_name || s?.parentName || '';
      const mobile = s?.phone || s?.parent_phone || s?.mobile || '';
      const studentId = s?.student_id?.toString() || s?.id?.toString() || '';
      const batchName = s?.batch?.name || '';

      return (
        name.toLowerCase().includes(searchTerm) ||
        parentName.toLowerCase().includes(searchTerm) ||
        mobile.includes(searchTerm) ||
        studentId.includes(searchTerm) ||
        batchName.toLowerCase().includes(searchTerm)
      );
    });
  };

  const calculateFinalAmount = () => {
    const baseAmount = parseFloat(receiptForm?.amount_paid || 0) || 0;
    const additionalCharges = parseFloat(receiptForm?.additional_charges || 0) || 0;
    const discount = parseFloat(receiptForm?.discount || 0) || 0;
    return baseAmount + additionalCharges - discount;
  };

  const handleReceiptSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    // Validate all fields
    const isValid =
      validateField('student_id', receiptForm.student_id) &&
      validateField('amount_paid', receiptForm.amount_paid) &&
      validateField('additional_charges', receiptForm.additional_charges) &&
      validateField('discount', receiptForm.discount) &&
      validateField('payment_date', receiptForm.payment_date);

    if (!isValid) {
      return;
    }

    try {
      const result = await adminPost('/admin/accounts/receipts', {
        student_id: parseInt(receiptForm.student_id, 10),
        amount: parseFloat(receiptForm.amount_paid),
        discount: parseFloat(receiptForm.discount || 0),
        additional_charges: parseFloat(receiptForm.additional_charges || 0),
        method: receiptForm.payment_method,
        payment_date: receiptForm.payment_date,
        status: 'completed',
      });
      setMessage({ text: result.message || 'Receipt created successfully', type: 'success' });
      setReceiptForm({ ...emptyReceiptForm, payment_date: new Date().toISOString().split('T')[0] });
      setFieldErrors({});
      setStudentSearchTerm('');
      setStudentLedger(null);
      setPendingAmount(null);
      setPendingFee(null);
      loadData();
    } catch (error) {
      // Handle structured validation errors from backend
      if (error.data && error.data.errors) {
        setBackendFieldErrors(error.data.errors);
        setMessage({ text: 'Please fix the validation errors below.', type: 'error' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    }
  };

  const handlePrintReceipt = (receipt) => {
    window.print();
  };

  const filteredReceipts =
    receipts?.filter((receipt) => {
      const matchesSearch =
        !searchQuery ||
        receipt.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.student?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Normalized comparison handles both "method" and "payment_method" schemas reliably
      const actualMethod = (receipt.method || receipt.payment_method || '').toLowerCase();
      const matchesMethod = !filterMethod || actualMethod === filterMethod.toLowerCase();

      const matchesDateFrom =
        !filterDateFrom || new Date(receipt.payment_date) >= new Date(filterDateFrom);
      const matchesDateTo =
        !filterDateTo || new Date(receipt.payment_date) <= new Date(filterDateTo);
      return matchesSearch && matchesMethod && matchesDateFrom && matchesDateTo;
    }) || [];

  return (
    <motion.div
      className="space-y-6 p-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Accounts & Invoicing Management</h2>
        <p className="text-muted">
          Manage receipts, track payments, and monitor financial performance.
        </p>
      </div>

      <div className="border-border flex gap-2 border-b">
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'create'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('create')}
        >
          Create Receipt
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'records'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('records')}
        >
          Receipt Records
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'dues'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('dues')}
        >
          Pending Dues
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'revenue'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Summary
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <form className="card" onSubmit={handleReceiptSubmit}>
            <h3 className="mb-4 font-bold">Create Receipt</h3>
            <div className="relative mb-4">
              <label className="label" htmlFor="receiptStudent">
                Student
              </label>
              <input
                id="receiptStudent"
                type="text"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors duration-200 ${
                  isDark 
                    ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                }`}
                placeholder="Search student by name, mobile or ID..."
                value={studentSearchTerm}
                onChange={(e) => {
                  setStudentSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 250)}
                onKeyDown={handleKeyDown}
                required
                autoComplete="off"
              />
              {dropdownOpen && studentSearchTerm && (
                <div className={`absolute z-50 w-full rounded-md border max-h-60 overflow-y-auto mt-1 shadow-lg transition-colors duration-200 ${
                  isDark 
                    ? 'bg-[#151824] border-slate-800' 
                    : 'bg-white border-slate-200'
                }`}>
                  {(() => {
                    const filteredStudents = getFilteredStudents();
                    if (filteredStudents.length === 0) {
                      return (
                        <div className={`px-4 py-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          No students found
                        </div>
                      );
                    }
                    return filteredStudents.map((s, index) => {
                      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
                      const parentName = s?.parent_name || s?.parentName || '—';
                      const mobile = s?.phone || s?.parent_phone || s?.mobile || '—';
                      const batchName = s?.batch?.name || '—';
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <div
                          key={s?.student_id || s?.id}
                          className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b last:border-b-0 ${
                            isDark
                              ? isHighlighted
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'hover:bg-slate-700/30 text-slate-300'
                              : isHighlighted
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'hover:bg-slate-100 text-slate-700'
                          } ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
                          onMouseDown={() => {
                            const studentId = s?.student_id || s?.id;
                            setReceiptForm({ ...receiptForm, student_id: studentId });
                            setStudentSearchTerm(name);
                            setDropdownOpen(false);
                            setHighlightedIndex(-1);
                            handleStudentSelection(studentId);
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="font-medium">{name}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="inline-block mr-3">Parent: {parentName}</span>
                            <span className="inline-block mr-3">Mobile: {mobile}</span>
                            <span className="inline-block">Batch: {batchName}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* LIVE PENDING AMOUNT UI PANEL */}
            <div className="mb-4 mt-2">
              <label className="label">Pending Amount</label>
              <div className="bg-accent/10 border-accent/20 flex items-center justify-between rounded-lg border p-3">
                <span className="text-muted text-sm">Total Outstanding Balance:</span>
                <span
                  className={`text-base font-bold ${pendingAmount > 0 ? 'text-warning' : 'text-muted'}`}
                >
                  {pendingAmount !== null
                    ? `$${Number(pendingAmount).toFixed(2)}`
                    : 'Select a student to view'}
                </span>
              </div>
            </div>

            {studentLedger && (
              <div className="bg-accent/10 border-accent/20 mb-4 rounded-lg border p-4">
                <h4 className="text-accent mb-2 font-semibold">Student Ledger</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted">Total Fee Due:</span>
                    <p className="font-medium">
                      ${Number(studentLedger.total_fee_due || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Total Paid:</span>
                    <p className="font-medium">
                      ${Number(studentLedger.total_paid || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Balance:</span>
                    <p className="font-medium">
                      ${Number(studentLedger.balance_outstanding || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="label" htmlFor="receiptAmount">
                Amount Paid
              </label>
              <input
                id="receiptAmount"
                name="amount_paid"
                type="number"
                min={0}
                step={0.01}
                className={`input-field ${fieldErrors.amount_paid ? 'border-red-500' : ''}`}
                value={receiptForm.amount_paid}
                onChange={handleReceiptChange}
                onBlur={() => validateField('amount_paid', receiptForm.amount_paid)}
                required
              />
              {fieldErrors.amount_paid && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.amount_paid}</p>
              )}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
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
                  className={`input-field ${fieldErrors.additional_charges ? 'border-red-500' : ''}`}
                  value={receiptForm.additional_charges}
                  onChange={handleReceiptChange}
                  onBlur={() => validateField('additional_charges', receiptForm.additional_charges)}
                  placeholder="e.g. uniform fees"
                />
                {fieldErrors.additional_charges && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.additional_charges}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="discount">
                  Discount
                </label>
                <input
                  id="discount"
                  name="discount"
                  type="number"
   import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

const emptyReceiptForm = {
  student_id: '',
  amount_paid: '',
  discount: '',
  additional_charges: '',
  payment_method: 'cash',
  payment_date: new Date().toISOString().split('T')[0],
};

export default function AccountsPanel() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('create');
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [durationPlans, setDurationPlans] = useState([]);
  const [receiptForm, setReceiptForm] = useState(emptyReceiptForm);
  const [studentLedger, setStudentLedger] = useState(null);
  const [pendingFee, setPendingFee] = useState(null);
  const [pendingAmount, setPendingAmount] = useState(null);
  const [pendingDues, setPendingDues] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
      case 'student_id':
        if (!value) {
          error = 'Student is required';
        }
        break;
      case 'amount_paid':
        if (!value || value.trim() === '') {
          error = 'Amount paid is required';
        } else if (isNaN(value) || parseFloat(value) < 0) {
          error = 'Amount paid must be a valid positive number';
        }
        break;
      case 'additional_charges':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          error = 'Additional charges must be a valid positive number';
        }
        break;
      case 'discount':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          error = 'Discount must be a valid positive number';
        }
        break;
      case 'payment_date':
        if (!value) {
          error = 'Payment date is required';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, receiptsRes, pendingDuesRes, revenueSummaryRes, durationPlansRes] =
        await Promise.all([
          adminGet('/admin/students'),
          adminGet('/admin/accounts/receipts'),
          adminGet('/admin/accounts/pending-dues'),
          adminGet('/admin/accounts/revenue-summary'),
          adminGet('/admin/duration-plans'),
        ]);
      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      const receiptsData = receiptsRes.data?.data || receiptsRes.data || [];
      setReceipts(Array.isArray(receiptsData) ? receiptsData : []);
      const pendingDuesData = pendingDuesRes.data?.data || pendingDuesRes.data || [];
      setPendingDues(Array.isArray(pendingDuesData) ? pendingDuesData : []);
      const revenueSummaryData = revenueSummaryRes.data?.data || revenueSummaryRes.data || null;
      setRevenueSummary(revenueSummaryData);
      setDurationPlans(durationPlansRes.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
      setReceipts([]);
      setPendingDues([]);
      setRevenueSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReceiptChange = (event) => {
    const { name, value } = event.target;
    setReceiptForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleStudentSelection = async (studentId) => {
    console.log('DEBUG: Selected Student ID changed to:', studentId);

    setReceiptForm((prev) => ({ ...prev, student_id: studentId }));
    setHighlightedIndex(-1);

    const selectedStudent = (students || []).find(
      (s) =>
        s?.student_id?.toString() === studentId.toString() ||
        s?.id?.toString() === studentId.toString(),
    );

    if (selectedStudent) {
      setStudentSearchTerm(
        selectedStudent?.name ||
          `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`,
      );
    }

    if (!studentId) {
      setPendingAmount(null);
      setPendingFee(null);
      setStudentLedger(null);
      setStudentSearchTerm('');
      return;
    }

    try {
      const result = await adminGet(`/admin/accounts/student-ledger/${studentId}`);
      if (result && result.data) {
        const remainingAmount =
          result.data.remaining || result.data.balance_outstanding || result.data.pendingFee || 0;
        setPendingFee(remainingAmount);
        setPendingAmount(remainingAmount);
        setStudentLedger(result.data?.data || result.data);
        setReceiptForm((prev) => ({ ...prev, amount_paid: remainingAmount.toString() }));
        return;
      }
    } catch (error) {
      console.warn('Backend ledger route unavailable, using local array fallback...', error);
    }

    if (selectedStudent) {
      const activeSelectedStudent = selectedStudent;
      const activeStudentPlan =
        activeSelectedStudent?.duration_plan || activeSelectedStudent?.durationPlan || '';
      const safePlansArray = durationPlans || [];

      const matchedPlanConfig = safePlansArray.find(
        (p) =>
          p?.name === activeStudentPlan ||
          p?._id === activeStudentPlan ||
          p?.plan_id === activeStudentPlan ||
          p?.id === activeStudentPlan,
      );

      const activeMultiplier = matchedPlanConfig
        ? parseFloat(matchedPlanConfig.multiplier || 1)
        : parseFloat(activeSelectedStudent?.plan_multiplier || 1);

      const baseSportsCost = parseFloat(
        activeSelectedStudent?.sports_base_fee || activeSelectedStudent?.sportsBaseFee || 0,
      );
      const finalMultipliedSportsFee = baseSportsCost * activeMultiplier;

      const regFeeAmount = parseFloat(
        activeSelectedStudent?.registration_fee || activeSelectedStudent?.registrationFee || 0,
      );
      const additionalSurchargesAmount = parseFloat(
        activeSelectedStudent?.additional_charges || activeSelectedStudent?.additionalCharges || 0,
      );
      const appliedDiscountAmount = parseFloat(activeSelectedStudent?.discount || 0);

      const accurateTotalFeesAssigned =
        finalMultipliedSportsFee +
        regFeeAmount +
        additionalSurchargesAmount -
        appliedDiscountAmount;

      const aggregatedPayments = (receipts || [])
        .filter(
          (p) =>
            (p.student_id?.toString() === studentId.toString() ||
              p.student?.student_id?.toString() === studentId.toString()) &&
            p.status?.toUpperCase() === 'COMPLETED',
        )
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const finalFeesPaidDisplayed = Math.min(aggregatedPayments, accurateTotalFeesAssigned);
      const finalLivePendingDues = Math.max(0, accurateTotalFeesAssigned - finalFeesPaidDisplayed);

      setPendingAmount(finalLivePendingDues);
      setPendingFee(finalLivePendingDues);

      setStudentLedger({
        total_fee_due: accurateTotalFeesAssigned,
        total_paid: finalFeesPaidDisplayed,
        balance_outstanding: finalLivePendingDues,
      });

      setReceiptForm((prev) => ({ ...prev, amount_paid: finalLivePendingDues.toString() }));
    } else {
      setPendingAmount(0);
      setPendingFee(0);
      setStudentLedger(null);
    }
  };

  const handleKeyDown = (e) => {
    const filteredStudents = getFilteredStudents();
    if (!dropdownOpen || filteredStudents.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredStudents.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredStudents.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredStudents[highlightedIndex]) {
          const student = filteredStudents[highlightedIndex];
          const studentId = student?.student_id || student?.id;
          setReceiptForm({ ...receiptForm, student_id: studentId });
          setStudentSearchTerm(student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`);
          setDropdownOpen(false);
          setHighlightedIndex(-1);
          handleStudentSelection(studentId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearchTerm) return [];
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
      const parentName = s?.parent_name || s?.parentName || '';
      const mobile = s?.phone || s?.parent_phone || s?.mobile || '';
      const studentId = s?.student_id?.toString() || s?.id?.toString() || '';
      const batchName = s?.batch?.name || '';

      return (
        name.toLowerCase().includes(searchTerm) ||
        parentName.toLowerCase().includes(searchTerm) ||
        mobile.includes(searchTerm) ||
        studentId.includes(searchTerm) ||
        batchName.toLowerCase().includes(searchTerm)
      );
    });
  };

  const calculateFinalAmount = () => {
    const baseAmount = parseFloat(receiptForm?.amount_paid || 0) || 0;
    const additionalCharges = parseFloat(receiptForm?.additional_charges || 0) || 0;
    const discount = parseFloat(receiptForm?.discount || 0) || 0;
    return baseAmount + additionalCharges - discount;
  };

  const handleReceiptSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    const isValid =
      validateField('student_id', receiptForm.student_id) &&
      validateField('amount_paid', receiptForm.amount_paid) &&
      validateField('additional_charges', receiptForm.additional_charges) &&
      validateField('discount', receiptForm.discount) &&
      validateField('payment_date', receiptForm.payment_date);

    if (!isValid) {
      return;
    }

    try {
      const result = await adminPost('/admin/accounts/receipts', {
        student_id: parseInt(receiptForm.student_id, 10),
        amount: parseFloat(receiptForm.amount_paid),
        discount: parseFloat(receiptForm.discount || 0),
        additional_charges: parseFloat(receiptForm.additional_charges || 0),
        method: receiptForm.payment_method,
        payment_date: receiptForm.payment_date,
        status: 'completed',
      });
      setMessage({ text: result.message || 'Receipt created successfully', type: 'success' });
      setReceiptForm({ ...emptyReceiptForm, payment_date: new Date().toISOString().split('T')[0] });
      setFieldErrors({});
      setStudentSearchTerm('');
      setStudentLedger(null);
      setPendingAmount(null);
      setPendingFee(null);
      loadData();
    } catch (error) {
      if (error.data && error.data.errors) {
        setBackendFieldErrors(error.data.errors);
        setMessage({ text: 'Please fix the validation errors below.', type: 'error' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    }
  };

  // NEW TRIGGER: DYNAMIC RECEIPT DOWNLOAD VIA EXTERNAL BACKEND ROUTE
  const handleDownloadInvoice = (receipt) => {
    const targetId = receipt.id || receipt.receipt_id || receipt.receipt_number;
    const receiptUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/admin/payments/${targetId}/receipt-pdf`;
    window.open(receiptUrl, '_blank');
  };

  // QUICK METRIC RESOLUTIONS FOR SUMMARY CARDS
  const resolvedMonthlyRevenue = revenueSummary?.total_collected || revenueSummary?.totalCollected || 
    receipts.reduce((sum, r) => sum + parseFloat(r.amount || r.amount_paid || 0), 0);

  const totalPendingCoachApprovalsCount = receipts.filter(r => r.status?.toLowerCase() === 'pending').length;

  const filteredReceipts =
    receipts?.filter((receipt) => {
      const matchesSearch =
        !searchQuery ||
        receipt.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.student?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const actualMethod = (receipt.method || receipt.payment_method || '').toLowerCase();
      const matchesMethod = !filterMethod || actualMethod === filterMethod.toLowerCase();

      const matchesDateFrom =
        !filterDateFrom || new Date(receipt.payment_date) >= new Date(filterDateFrom);
      const matchesDateTo =
        !filterDateTo || new Date(receipt.payment_date) <= new Date(filterDateTo);
      return matchesSearch && matchesMethod && matchesDateFrom && matchesDateTo;
    }) || [];

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.div
      className="space-y-6 p-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Accounts & Invoicing Management</h2>
        <p className="text-muted text-sm">
          Manage receipts, track payments, and monitor financial performance.
        </p>
      </div>

      {/* NEW FEATURE: TOP METRIC STATS CARDS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-6 rounded-xl shadow-xs border flex items-center justify-between ${isDark ? 'bg-[#151824] border-slate-800' : 'bg-white border-slate-100'}`}>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue Collected</p>
            <h3 className="text-2xl font-bold text-emerald-500 mt-1">
              ${parseFloat(resolvedMonthlyRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 text-xl">💰</div>
        </div>

        <div className={`p-6 rounded-xl shadow-xs border flex items-center justify-between ${isDark ? 'bg-[#151824] border-slate-800' : 'bg-white border-slate-100'}`}>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pending Coach Approvals</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">
              {totalPendingCoachApprovalsCount} Payments
            </h3>
          </div>
          <div className={`p-3 rounded-full text-xl bg-amber-500/10 text-amber-500 ${totalPendingCoachApprovalsCount > 0 ? 'animate-pulse' : ''}`}>
            ⏳
          </div>
        </div>
      </div>

      {/* FEEDBACK SYSTEM MESSAGES */}
      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {message.text}
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="border-border flex gap-2 border-b">
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'create'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('create')}
        >
          Create Receipt
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'records'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('records')}
        >
          Receipt Records
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'dues'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('dues')}
        >
          Pending Dues
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'revenue'
              ? 'border-accent text-accent bg-accent/10 rounded-t-lg border-b-2'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Summary
        </button>
      </div>

      {/* ACTIVE CONTAINER CONTROLLER RENDERING */}
      {activeTab === 'create' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <form className="card" onSubmit={handleReceiptSubmit}>
            <h3 className="mb-4 font-bold">Create Receipt</h3>
            <div className="relative mb-4">
              <label className="label" htmlFor="receiptStudent">
                Student
              </label>
              <input
                id="receiptStudent"
                type="text"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors duration-200 ${
                  isDark 
                    ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                }`}
                placeholder="Search student by name, mobile or ID..."
                value={studentSearchTerm}
                onChange={(e) => {
                  setStudentSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 250)}
                onKeyDown={handleKeyDown}
                required
                autoComplete="off"
              />
              {dropdownOpen && studentSearchTerm && (
                <div className={`absolute z-50 w-full rounded-md border max-h-60 overflow-y-auto mt-1 shadow-lg transition-colors duration-200 ${
                  isDark 
                    ? 'bg-[#151824] border-slate-800' 
                    : 'bg-white border-slate-200'
                }`}>
                  {(() => {
                    const filteredStudents = getFilteredStudents();
                    if (filteredStudents.length === 0) {
                      return (
                        <div className={`px-4 py-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          No students found
                        </div>
                      );
                    }
                    return filteredStudents.map((s, index) => {
                      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
                      const parentName = s?.parent_name || s?.parentName || '—';
                      const mobile = s?.phone || s?.parent_phone || s?.mobile || '—';
                      const batchName = s?.batch?.name || '—';
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <div
                          key={s?.student_id || s?.id}
                          className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b last:border-b-0 ${
                            isDark
                              ? isHighlighted
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'hover:bg-slate-700/30 text-slate-300'
                              : isHighlighted
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'hover:bg-slate-100 text-slate-700'
                          } ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
                          onMouseDown={() => {
                            const studentId = s?.student_id || s?.id;
                            setReceiptForm({ ...receiptForm, student_id: studentId });
                            setStudentSearchTerm(name);
                            setDropdownOpen(false);
                            setHighlightedIndex(-1);
                            handleStudentSelection(studentId);
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="font-medium">{name}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="inline-block mr-3">Parent: {parentName}</span>
                            <span className="inline-block mr-3">Mobile: {mobile}</span>
                            <span className="inline-block">Batch: {batchName}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="mb-4 mt-2">
              <label className="label">Pending Amount</label>
              <div className="bg-accent/10 border-accent/20 flex items-center justify-between rounded-lg border p-3">
                <span className="text-muted text-sm">Total Outstanding Balance:</span>
                <span className={`text-base font-bold ${pendingAmount > 0 ? 'text-warning' : 'text-muted'}`}>
                  {pendingAmount !== null ? `$${Number(pendingAmount).toFixed(2)}` : 'Select a student to view'}
                </span>
              </div>
            </div>

            {studentLedger && (
              <div className="bg-accent/10 border-accent/20 mb-4 rounded-lg border p-4">
                <h4 className="text-accent mb-2 font-semibold">Student Ledger</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted">Total Fee Due:</span>
                    <p className="font-medium">${Number(studentLedger.total_fee_due || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Total Paid:</span>
                    <p className="font-medium">${Number(studentLedger.total_paid || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted">Balance:</span>
                    <p className="font-medium">${Number(studentLedger.balance_outstanding || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="label" htmlFor="receiptAmount">Amount Paid</label>
              <input
                id="receiptAmount"
                name="amount_paid"
                type="number"
                min={0}
                step={0.01}
                className={`input-field ${fieldErrors.amount_paid ? 'border-red-500' : ''}`}
                value={receiptForm.amount_paid}
                onChange={handleReceiptChange}
                onBlur={() => validateField('amount_paid', receiptForm.amount_paid)}
                required
              />
              {fieldErrors.amount_paid && <p className="mt-1 text-xs text-red-500">{fieldErrors.amount_paid}</p>}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="additionalCharges">Additional Charges</label>
                <input
                  id="additionalCharges"
                  name="additional_charges"
                  type="number"
                  min={0}
                  step={0.01}
                  className={`input-field ${fieldErrors.additional_charges ? 'border-red-500' : ''}`}
                  value={receiptForm.additional_charges}
                  onChange={handleReceiptChange}
                  onBlur={() => validateField('additional_charges', receiptForm.additional_charges)}
                  placeholder="e.g. uniform fees"
                />
                {fieldErrors.additional_charges && <p className="mt-1 text-xs text-red-500">{fieldErrors.additional_charges}</p>}
              </div>
              <div>
                <label className="label" htmlFor="discount">Discount</label>
                <input
                  id="discount"
                  name="discount"
                  type="number"
                  min={0}
                  step={0.01}
                  className={`input-field ${fieldErrors.discount ? 'border-red-500' : ''}`}
                  value={receiptForm.discount}
                  onChange={handleReceiptChange}
                  onBlur={() => validateField('discount', receiptForm.discount)}
                  placeholder="e.g. scholarship"
                />
                {fieldErrors.discount && <p className="mt-1 text-xs text-red-500">{fieldErrors.discount}</p>}
              </div>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="paymentMethod">Payment Method</label>
              <select
                id="paymentMethod"
                name="payment_method"
                className="input-field"
                value={receiptForm.payment_method}
                onChange={handleReceiptChange}
                required
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="paymentDate">Payment Date</label>
              <input
                id="paymentDate"
                name="payment_date"
                type="date"
                className={`input-field ${fieldErrors.payment_date ? 'border-red-500' : ''}`}
                value={receiptForm.payment_date}
                onChange={handleReceiptChange}
                onBlur={() => validateField('payment_date', receiptForm.payment_date)}
                required
              />
              {fieldErrors.payment_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.payment_date}</p>}
            </div>

            {(studentLedger || pendingAmount > 0) && (
              <div className="bg-accent/10 border-accent/20 mb-4 rounded-lg border p-4">
                <h4 className="text-accent mb-2 font-semibold">Final Collection Amount</h4>
                <p className="text-accent text-2xl font-bold">${calculateFinalAmount().toFixed(2)}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">Create Receipt</button>
          </form>

          <div className="card">
            <h3 className="mb-4 font-bold">Receipt Preview</h3>
            {receiptForm.student_id ? (
              <div className="bg-surface text-foreground rounded-lg border p-4">
                <div className="mb-4 text-center">
                  <h4 className="text-lg font-bold">OFFICIAL RECEIPT</h4>
                  <p className="text-muted text-sm">Academy Management System</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Student:</span>
                    <span className="font-medium">
                      {(students || []).find(s => (s?.student_id || s?.id)?.toString() === receiptForm.student_id?.toString())?.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{new Date(receiptForm.payment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-medium capitalize">{receiptForm.payment_method}</span>
                  </div>
                  <hr className="my-2 border-slate-700/30" />
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>${Number(receiptForm.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(receiptForm?.additional_charges || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Charges:</span>
                      <span>${parseFloat(receiptForm?.additional_charges || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(receiptForm?.discount || 0) > 0 && (
                    <div className="text-danger flex justify-between">
                      <span>Discount:</span>
                      <span>-${parseFloat(receiptForm?.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2 border-slate-700/30" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${calculateFinalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted py-8 text-center">Select a student to preview receipt</p>
            )}
          </div>
        </div>
      ) : activeTab === 'records' ? (
        <div className="card">
          <h3 className="mb-4 font-bold">Receipt Records</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-4">
            <input type="text" className="input-field" placeholder="Search by receipt # or student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <select className="input-field" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <input type="date" className="input-field" placeholder="From Date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            <input type="date" className="input-field" placeholder="To Date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-700/30">
              <thead>
                <tr className="text-left font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Source / Coach</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3">Proof</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/20">
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                    <tr key={receipt.id || receipt.receipt_number} className="hover:bg-slate-500/5">
                      <td className="px-4 py-3 font-mono">{receipt.receipt_number || '—'}</td>
                      <td className="px-4 py-3 font-medium">{receipt.student?.name || '—'}</td>
                      
                      {/* SUBMITTED BY COACH BADGE */}
                      <td className="px-4 py-3">
                        {receipt.collected_by?.name ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-xs px-2 py-0.5 rounded border border-indigo-500/20">
                            👤 {receipt.collected_by.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 text-xs px-2 py-0.5 rounded border border-slate-500/20">
                            ⚙️ Direct Admin
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold">${parseFloat(receipt.amount || receipt.amount_paid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 uppercase font-mono text-xs">{receipt.method || receipt.payment_method}</td>
                      <td className="px-4 py-3 text-xs text-muted max-w-32 truncate">{receipt.remarks || '—'}</td>
                      <td className="px-4 py-3">
                        {receipt.proof_url ? (
                          <a href={receipt.proof_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">
                            📸 View
                          </a>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{new Date(receipt.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {/* LOCAL PRINT TRIGGER */}
                        <button onClick={() => handlePrintReceipt(receipt)} className="text-accent hover:underline text-xs">Print</button>
                        
                        {/* NEW FEATURE: DOWNLOAD REMOTE PDF TRACE */}
                        <button onClick={() => handleDownloadInvoice(receipt)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20 transition-all">
                          📥 PDF Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-muted italic">No matching receipt records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'dues' ? (
        <div className="card overflow-x-auto">
          <h3 className="mb-4 font-bold">Pending Dues</h3>
          <table className="min-w-full text-sm divide-y divide-gray-700/30">
            <thead>
              <tr className="text-left font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Parent Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Pending Balance</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/20">
              {pendingDues.length > 0 ? (
                pendingDues.map((due) => (
                  <tr key={due.student_id || due.id} className="hover:bg-slate-500/5">
                    <td className="px-4 py-3 font-medium">{due.student_name || due.name || '—'}</td>
                    <td className="px-4 py-3">{due.parent_name || '—'}</td>
                    <td className="px-4 py-3 font-mono">{due.phone || due.parent_phone || '—'}</td>
                    <td className="px-4 py-3 font-bold text-warning">${parseFloat(due.balance_outstanding || due.pending_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button 
                        onClick={() => {
                          setActiveTab('create');
                          handleStudentSelection((due.student_id || due.id).toString());
                        }} 
                        className="btn-primary text-xs px-3 py-1 rounded"
                      >
                        Collect Fee
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-muted italic">No students with outstanding pending dues.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <h3 className="mb-4 font-bold">Revenue Summary Indicators</h3>
          {revenueSummary ? (
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="border border-slate-700/30 p-4 rounded-lg">
                <span className="text-muted block mb-1">Gross Collections:</span>
                <p className="text-xl font-bold text-emerald-500">${parseFloat(revenueSummary.total_collected || 0).toFixed(2)}</p>
              </div>
              <div className="border border-slate-700/30 p-4 rounded-lg">
                <span className="text-muted block mb-1">Total Discounts Given:</span>
                <p className="text-xl font-bold text-red-400">${parseFloat(revenueSummary.total_discount || 0).toFixed(2)}</p>
              </div>
              <div className="border border-slate-700/30 p-4 rounded-lg">
                <span className="text-muted block mb-1">Additional Surcharges:</span>
                <p className="text-xl font-bold text-accent">${parseFloat(revenueSummary.total_additional_charges || 0).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted italic">No financial metrics found for active timeline aggregation.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}