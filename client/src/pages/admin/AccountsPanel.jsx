import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost } from '../../api/client';

const emptyReceiptForm = {
  student_id: '',
  amount_paid: '',
  discount: '',
  additional_charges: '',
  payment_method: 'cash',
  payment_date: new Date().toISOString().split('T')[0]
};

export default function AccountsPanel() {
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, receiptsRes, pendingDuesRes, revenueSummaryRes, durationPlansRes] = await Promise.all([
        adminGet('/admin/students'),
        adminGet('/admin/accounts/receipts'),
        adminGet('/admin/accounts/pending-dues'),
        adminGet('/admin/accounts/revenue-summary'),
        adminGet('/admin/duration-plans')
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
  };

  const handleStudentSelection = async (studentId) => {
    console.log("DEBUG: Selected Student ID changed to:", studentId);

    setReceiptForm(prev => ({ ...prev, student_id: studentId }));

    if (!studentId) {
      setPendingAmount(null);
      setPendingFee(null);
      setStudentLedger(null);
      return;
    }

    try {
      const result = await adminGet(`/admin/accounts/student-ledger/${studentId}`);
      if (result && result.data) {
        const remainingAmount = result.data.remaining || result.data.balance_outstanding || result.data.pendingFee || 0;
        setPendingFee(remainingAmount);
        setPendingAmount(remainingAmount);
        setStudentLedger(result.data?.data || result.data);
        setReceiptForm(prev => ({ ...prev, amount_paid: remainingAmount.toString() }));
        return;
      }
    } catch (error) {
      console.warn("Backend ledger route unavailable, using local array fallback...", error);
    }

    const selectedStudent = (students || []).find(s =>
      s?.student_id?.toString() === studentId.toString() ||
      s?.id?.toString() === studentId.toString()
    );

    if (selectedStudent) {
      // CORRECT DYNAMIC ASSIGNED FEES LOGIC
      const activeSelectedStudent = selectedStudent;
      const activeStudentPlan = activeSelectedStudent?.duration_plan || activeSelectedStudent?.durationPlan || "";
      const safePlansArray = durationPlans || [];
      
      // 1. Look up the live duration plan multiplier from the database
      const matchedPlanConfig = safePlansArray.find(p => p?.name === activeStudentPlan || p?._id === activeStudentPlan || p?.plan_id === activeStudentPlan || p?.id === activeStudentPlan);
      
      // 2. Resolve multiplier fallback gracefully
      const activeMultiplier = matchedPlanConfig ? parseFloat(matchedPlanConfig.multiplier || 1) : parseFloat(activeSelectedStudent?.plan_multiplier || 1);
      
      // 3. Compute accurate full multi-factor fee assigned at registration
      const baseSportsCost = parseFloat(activeSelectedStudent?.sports_base_fee || activeSelectedStudent?.sportsBaseFee || 0);
      const finalMultipliedSportsFee = baseSportsCost * activeMultiplier;
      
      const regFeeAmount = parseFloat(activeSelectedStudent?.registration_fee || activeSelectedStudent?.registrationFee || 0);
      const additionalSurchargesAmount = parseFloat(activeSelectedStudent?.additional_charges || activeSelectedStudent?.additionalCharges || 0);
      const appliedDiscountAmount = parseFloat(activeSelectedStudent?.discount || 0);
      
      // Dynamic assigned threshold
      const accurateTotalFeesAssigned = finalMultipliedSportsFee + regFeeAmount + additionalSurchargesAmount - appliedDiscountAmount;

      // AGGREGATE TOTAL PAID FEES CORRECTLY
      const aggregatedPayments = (receipts || [])
        .filter(p => (p.student_id?.toString() === studentId.toString() || p.student?.student_id?.toString() === studentId.toString()) && p.status?.toUpperCase() === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // ENFORCE LOGICAL CONSTRAINT CAP (Safety Shield)
      // Paid fees can never be greater than assigned fees
      const finalFeesPaidDisplayed = Math.min(aggregatedPayments, accurateTotalFeesAssigned);
      
      // Calculate the true remaining pending balance
      const finalLivePendingDues = Math.max(0, accurateTotalFeesAssigned - finalFeesPaidDisplayed);

      setPendingAmount(finalLivePendingDues);
      setPendingFee(finalLivePendingDues);
      
      // Update student ledger with corrected values
      setStudentLedger({
        total_fee_due: accurateTotalFeesAssigned,
        total_paid: finalFeesPaidDisplayed,
        balance_outstanding: finalLivePendingDues
      });
      
      setReceiptForm(prev => ({ ...prev, amount_paid: finalLivePendingDues.toString() }));
    } else {
      setPendingAmount(0);
      setPendingFee(0);
      setStudentLedger(null);
    }
  };

  const calculateFinalAmount = () => {
    const baseAmount = parseFloat(studentLedger?.total_fee_due || pendingAmount || 0) || 0;
    const additionalCharges = parseFloat(receiptForm?.additional_charges || 0) || 0;
    const discount = parseFloat(receiptForm?.discount || 0) || 0;
    return baseAmount + additionalCharges - discount;
  };

  const handleReceiptSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/accounts/receipts', {
        student_id: parseInt(receiptForm.student_id, 10),
        amount_paid: parseFloat(receiptForm.amount_paid),
        discount: parseFloat(receiptForm.discount || 0),
        additional_charges: parseFloat(receiptForm.additional_charges || 0),
        payment_method: receiptForm.payment_method,
        payment_date: receiptForm.payment_date
      });
      setMessage({ text: result.message, type: 'success' });
      setReceiptForm({ ...emptyReceiptForm, payment_date: new Date().toISOString().split('T')[0] });
      setStudentLedger(null);
      setPendingAmount(null);
      setPendingFee(null);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handlePrintReceipt = (receipt) => {
    window.print();
  };

  const filteredReceipts = receipts?.filter(receipt => {
    const matchesSearch = !searchQuery ||
      receipt.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = !filterMethod || receipt.method === filterMethod;
    const matchesDateFrom = !filterDateFrom || new Date(receipt.payment_date) >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || new Date(receipt.payment_date) <= new Date(filterDateTo);
    return matchesSearch && matchesMethod && matchesDateFrom && matchesDateTo;
  }) || [];

  return (
    <motion.div 
      className="space-y-6 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Accounts & Invoicing Management</h2>
        <p className="text-muted">Manage receipts, track payments, and monitor financial performance.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'create'
              ? 'border-b-2 border-accent text-accent bg-accent/10 rounded-t-lg'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('create')}
        >
          Create Receipt
        </button>
        <button
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'records'
              ? 'border-b-2 border-accent text-accent bg-accent/10 rounded-t-lg'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('records')}
        >
          Receipt Records
        </button>
        <button
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'dues'
              ? 'border-b-2 border-accent text-accent bg-accent/10 rounded-t-lg'
              : 'text-muted hover:text-accent hover:bg-surface-secondary'
          }`}
          onClick={() => setActiveTab('dues')}
        >
          Pending Dues
        </button>
        <button
          className={`px-4 py-2 font-medium transition-all duration-300 ${
            activeTab === 'revenue'
              ? 'border-b-2 border-accent text-accent bg-accent/10 rounded-t-lg'
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
            <div className="mb-4">
              <label className="label" htmlFor="receiptStudent">Student</label>
              <select
                id="receiptStudent"
                name="student_id"
                className="input-field"
                value={receiptForm.student_id}
                onChange={(e) => handleStudentSelection(e.target.value)}
                required
              >
                <option value="">Select student…</option>
                {(students || []).map((s) => (
                  <option key={s?.student_id || s?.id} value={s?.student_id || s?.id}>
                    {s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* LIVE PENDING AMOUNT UI PANEL */}
            <div className="mt-2 mb-4">
              <label className="label">
                Pending Amount
              </label>
              <div className="p-3 rounded-lg border bg-accent/10 border-accent/20 flex items-center justify-between">
                <span className="text-sm text-muted">Total Outstanding Balance:</span>
                <span className={`text-base font-bold ${pendingAmount > 0 ? 'text-warning' : 'text-muted'}`}>
                  {pendingAmount !== null ? `$${Number(pendingAmount).toFixed(2)}` : 'Select a student to view'}
                </span>
              </div>
            </div>

            {studentLedger && (
              <div className="mb-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-accent">Student Ledger</h4>
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
                className="input-field"
                value={receiptForm.amount_paid}
                onChange={handleReceiptChange}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="label" htmlFor="additionalCharges">Additional Charges</label>
                <input
                  id="additionalCharges"
                  name="additional_charges"
                  type="number"
                  min={0}
                  step={0.01}
                  className="input-field"
                  value={receiptForm.additional_charges}
                  onChange={handleReceiptChange}
                  placeholder="e.g. uniform fees"
                />
              </div>
              <div>
                <label className="label" htmlFor="discount">Discount</label>
                <input
                  id="discount"
                  name="discount"
                  type="number"
                  min={0}
                  step={0.01}
                  className="input-field"
                  value={receiptForm.discount}
                  onChange={handleReceiptChange}
                  placeholder="e.g. scholarship"
                />
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
                className="input-field"
                value={receiptForm.payment_date}
                onChange={handleReceiptChange}
                required
              />
            </div>

            {(studentLedger || pendingAmount > 0) && (
              <div className="mb-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-accent">Final Collection Amount</h4>
                <p className="text-2xl font-bold text-accent">${calculateFinalAmount().toFixed(2)}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">Create Receipt</button>
          </form>

          <div className="card">
            <h3 className="mb-4 font-bold">Receipt Preview</h3>
            {receiptForm.student_id ? (
              <div className="p-4 border rounded-lg bg-surface text-foreground">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold">OFFICIAL RECEIPT</h4>
                  <p className="text-sm text-muted">Academy Management System</p>
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
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>${Number(studentLedger?.total_fee_due || pendingAmount || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(receiptForm?.additional_charges || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Charges:</span>
                      <span>${parseFloat(receiptForm?.additional_charges || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(receiptForm?.discount || 0) > 0 && (
                    <div className="flex justify-between text-danger">
                      <span>Discount:</span>
                      <span>-${parseFloat(receiptForm?.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateFinalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Select a student to preview receipt</p>
            )}
          </div>
        </div>
      ) : activeTab === 'records' ? (
        <div className="card overflow-x-auto">
          <h3 className="mb-4 font-bold">Receipt Records</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-4">
            <div>
              <input
                type="text"
                className="input-field"
                placeholder="Search by receipt # or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <select
                className="input-field"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                className="input-field"
                placeholder="From Date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <input
                type="date"
                className="input-field"
                placeholder="To Date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receipt #</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Method</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts && Array.isArray(filteredReceipts) && filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt, index) => (
                    <motion.tr
                      key={receipt.receipt_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    >
                      <td className="p-3 font-medium text-slate-800">{receipt.receipt_number}</td>
                      <td className="p-3 text-sm font-medium text-slate-800">{receipt.student?.name || '—'}</td>
                      <td className="p-3 text-sm font-medium text-slate-800">${Number(receipt.amount).toFixed(2)}</td>
                      <td className="p-3 text-sm font-medium text-slate-800">{new Date(receipt.payment_date).toLocaleDateString()}</td>
                      <td className="p-3 text-sm font-medium text-slate-800 capitalize">{receipt.method || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          receipt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          receipt.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {receipt.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handlePrintReceipt(receipt)}
                          className="text-emerald-600 hover:text-emerald-800 text-sm font-medium transition-colors"
                        >
                          Print
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || filterMethod || filterDateFrom || filterDateTo
                        ? 'No receipts match your filters.'
                        : 'No receipt records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'dues' ? (
        <div className="card overflow-x-auto">
          <h3 className="mb-4 font-bold">Pending Dues</h3>
          <p className="text-muted mb-4">Students with remaining unpaid balances.</p>
          {loading ? (
            <Loader />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3">Student</th>
                  <th className="pb-3 px-2">Sport</th>
                  <th className="pb-3 px-2">Total Fee Due</th>
                  <th className="pb-3 px-2">Total Paid</th>
                  <th className="pb-3 px-2">Balance Outstanding</th>
                  <th className="pb-3 px-2">Next Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingDues && Array.isArray(pendingDues) && pendingDues.length > 0 ? (
                  pendingDues.map((due) => (
                    <tr key={due.student_id} className="text-foreground">
                      <td className="py-3 font-medium">{due.student_name}</td>
                      <td className="py-3 px-2 text-muted">{due.sport}</td>
                      <td className="py-3 px-2">${Number(due.total_fee_due).toFixed(2)}</td>
                      <td className="py-3 px-2">${Number(due.total_paid).toFixed(2)}</td>
                      <td className="py-3 px-2 font-semibold text-danger text-sm">${Number(due.balance_outstanding).toFixed(2)}</td>
                      <td className="py-3 px-2">{new Date(due.next_due_date).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted text-xs">
                      No pending dues found. All students are up to date!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          <h3 className="mb-4 font-bold">Revenue Summary</h3>
          <p className="text-muted mb-4">Historical performance matrix.</p>
          {loading ? (
            <Loader />
          ) : revenueSummary ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="text-sm text-muted mb-1">Total Revenue</h4>
                <p className="text-2xl font-bold text-accent">${Number(revenueSummary.total_revenue).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="text-sm text-muted mb-1">Current Year</h4>
                <p className="text-2xl font-bold text-accent">${Number(revenueSummary.current_year_revenue).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="text-sm text-muted mb-1">Current Month</h4>
                <p className="text-2xl font-bold text-accent">${Number(revenueSummary.current_month_revenue).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-surface-secondary border border-border rounded-lg">
                <h4 className="text-sm text-muted mb-1">Total Receipts</h4>
                <p className="text-2xl font-bold text-foreground">{revenueSummary.total_receipts}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <h4 className="font-semibold mb-3">Revenue by Payment Method</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(revenueSummary.revenue_by_method || {}).map(([method, amount]) => (
                    <div key={method} className="p-3 border border-border rounded-lg bg-surface-secondary">
                      <span className="text-sm text-muted capitalize">{method}</span>
                      <p className="text-lg font-semibold text-foreground">${Number(amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted text-xs">
              No revenue data available.
            </div>
          )}
        </div>
      )}

      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
    </motion.div>
  );
}