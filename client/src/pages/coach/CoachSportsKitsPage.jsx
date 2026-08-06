import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  BarChart2,
  Layers,
  UserCheck,
  Activity,
  Filter,
  RotateCcw,
  DollarSign,
  CreditCard,
  GraduationCap,
  ArrowLeft,
  Trophy
} from 'lucide-react';
import { coachGet, coachPost, coachPatch } from '../../api/client';
import StandardModal from '../../components/StandardModal';

// ─── Flash hook ──────────────────────────────────────────────────────────────
function useFlash() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const flash = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };
  return [message, flash];
}

// ─── Flash Banner ──────────────────────────────────────────────────────────────
function FlashBanner({ message }) {
  return (
    <AnimatePresence>
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
            message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
          }`}
        >
          {message.type === 'error'
            ? <AlertCircle className="w-5 h-5 shrink-0" />
            : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-sm">{message.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: BarChart2 },
  { id: 'my-kits',   label: 'My Assigned Kits',   icon: Package },
  { id: 'assign',    label: 'Assign to Student',  icon: GraduationCap },
  { id: 'history',   label: 'Assignment History', icon: Activity },
];

// ─── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [message, flash] = useFlash();

  useEffect(() => {
    (async () => {
      try {
        const [kitsRes, assignRes] = await Promise.all([
          coachGet('/coach/inventory/kits'),
          coachGet('/coach/inventory/kits/student-assignments'),
        ]);

        const kits = kitsRes.data || [];
        const studentAssignments = assignRes.data || [];

        const totalKitsAssigned = kits.length;
        const totalStock = kits.reduce((s, k) => s + (k.quantity || 0), 0);
        const totalRemaining = kits.reduce((s, k) => s + (k.remaining_qty || 0), 0);
        const assignedToStudents = totalStock - totalRemaining;
        const lowStock = kits.filter(k => (k.remaining_qty || 0) <= 1 && (k.quantity || 0) > 0).length;
        const pendingPayments = studentAssignments.filter(a => a.payment_status === 'UNPAID').length;

        const recent = [...studentAssignments]
          .sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
          .slice(0, 5);

        setData({ totalKitsAssigned, totalStock, totalRemaining, assignedToStudents, lowStock, pendingPayments, recent });
      } catch (err) {
        flash(err.message || 'Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const kpis = [
    {
      label: 'Kits Assigned',
      val: data?.totalKitsAssigned,
      icon: ShieldCheck,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'
    },
    {
      label: 'Total Stock',
      val: data?.totalStock,
      icon: Layers,
      color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400'
    },
    {
      label: 'Remaining Stock',
      val: data?.totalRemaining,
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
    },
    {
      label: 'Given to Students',
      val: data?.assignedToStudents,
      icon: UserCheck,
      color: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400'
    },
    {
      label: 'Pending Payments',
      val: data?.pendingPayments,
      icon: DollarSign,
      color: data?.pendingPayments > 0
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 animate-pulse'
        : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/30'
    },
    {
      label: 'Low Stock Kits',
      val: data?.lowStock,
      icon: AlertTriangle,
      color: data?.lowStock > 0
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 animate-pulse'
        : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/30'
    },
  ];

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">My Sports Kits Overview</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Kits assigned to you by admin — your distribution summary.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className={`p-5 rounded-2xl border flex flex-col gap-2 shadow-sm ${kpi.color}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{kpi.label}</span>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div className="text-3xl font-black tracking-tight">{kpi.val ?? '—'}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent Assignments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Recent Student Assignments
          </h3>
          <span className="text-xs text-muted-foreground">Last 5</span>
        </div>
        {!data?.recent?.length ? (
          <div className="p-10 text-center text-muted-foreground text-xs">No assignments made yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Student</th>
                  <th className="p-4">Kit</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recent.map(item => (
                  <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                    <td className="p-4 font-semibold">{item.student?.name || '—'}</td>
                    <td className="p-4">{item.kit?.name || '—'}</td>
                    <td className="p-4">{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MY ASSIGNED KITS TAB ─────────────────────────────────────────────────────
function MyKitsTab() {
  const [loading, setLoading] = useState(true);
  const [kits, setKits] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [search, setSearch] = useState('');
  const [message, flash] = useFlash();

  useEffect(() => {
    (async () => {
      try {
        const res = await coachGet('/coach/inventory/kits');
        setKits(res.data || []);
      } catch (err) {
        flash(err.message || 'Failed to load kits', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  // Group by sport
  const sportMap = {};
  kits.forEach(k => {
    const sportName = k.kit?.sport?.name || 'Unknown';
    if (!sportMap[sportName]) sportMap[sportName] = [];
    sportMap[sportName].push(k);
  });
  const sports = Object.keys(sportMap);

  const displayKits = selectedSport
    ? (sportMap[selectedSport] || []).filter(k => k.kit?.name?.toLowerCase().includes(search.toLowerCase()))
    : kits.filter(k => k.kit?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">My Assigned Kits</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Kits assigned to you by admin. You can distribute these to your students.</p>
      </div>

      {/* Sport Filter Pills */}
      {sports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSport(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!selectedSport ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            All Sports
          </button>
          {sports.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSport(s === selectedSport ? null : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSport === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {s} <span className="opacity-70">({sportMap[s].length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search kit name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
        />
      </div>

      {displayKits.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Package className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
          <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">No Kits Assigned</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask admin to assign kits to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayKits.map(assignment => {
            const kit = assignment.kit;
            const items = (() => { try { return JSON.parse(kit?.items || '[]'); } catch { return []; } })();
            const isLowStock = (assignment.remaining_qty || 0) <= 1 && (assignment.quantity || 0) > 0;

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Top accent bar */}
                <div className={`h-1 w-full ${isLowStock ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`} />

                <div className="p-5 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{kit?.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                          {kit?.sport?.name || '—'}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-600 dark:text-emerald-400 text-lg font-black">₹{Number(kit?.selling_price || 0)}</div>
                      <div className="text-[10px] text-muted-foreground">per kit</div>
                    </div>
                  </div>

                  {/* Stock Metrics */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold mb-0.5">Assigned to Me</div>
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{assignment.quantity}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold mb-0.5">Remaining</div>
                      <div className={`text-sm font-black ${
                        assignment.remaining_qty === 0 ? 'text-rose-500' :
                        isLowStock ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {assignment.remaining_qty}
                      </div>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>Distribution</span>
                      <span>{Math.round(((assignment.quantity - assignment.remaining_qty) / Math.max(assignment.quantity, 1)) * 100)}% used</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isLowStock ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`}
                        style={{ width: `${Math.round(((assignment.quantity - assignment.remaining_qty) / Math.max(assignment.quantity, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Kit Items */}
                  {items.length > 0 && (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kit Contents
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.slice(0, 4).map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.name}</span>
                            <span className="text-muted-foreground">× {item.qty}</span>
                          </div>
                        ))}
                        {items.length > 4 && (
                          <div className="px-3 py-1.5 text-[10px] text-slate-400 italic">+{items.length - 4} more items</div>
                        )}
                      </div>
                    </div>
                  )}

                  {assignment.notes && (
                    <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 italic">
                      "{assignment.notes}"
                    </p>
                  )}
                </div>

                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[10px] text-muted-foreground font-semibold text-center">
                  Assigned on {new Date(assignment.assignment_date).toLocaleDateString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ASSIGN TO STUDENT TAB ────────────────────────────────────────────────────
function AssignToStudentTab() {
  const [loading, setLoading] = useState(true);
  const [myKits, setMyKits] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [message, flash] = useFlash();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    student_id: '',
    kit_id: '',
    quantity: 1,
    unit_price: 0,
    discount: 0,
    payment_status: 'UNPAID',
    remarks: '',
    issue_date: new Date().toISOString().split('T')[0],
  });
  const [existingAssignments, setExistingAssignments] = useState(0);

  // Derived selections
  const [selectedKit, setSelectedKit] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filteredStudents = myStudents.filter(s => {
    const search = studentSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(search) ||
      String(s.student_id).includes(search) ||
      s.phone?.includes(search) ||
      s.admission_number?.toLowerCase().includes(search)
    );
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kitsRes, studentsRes] = await Promise.all([
        coachGet('/coach/inventory/kits'),
        coachGet('/coach/students-fee-summary'),
      ]);
      const kits = (kitsRes.data || []).filter(k => (k.remaining_qty || 0) > 0 && k.status !== 'REVOKED');
      setMyKits(kits);

      const allStudents = studentsRes.data?.students || studentsRes.data || [];
      setMyStudents(allStudents);
    } catch (err) {
      flash(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleKitSelect = (kitId) => {
    const kit = myKits.find(k => k.kit_id === parseInt(kitId, 10) || k.id === parseInt(kitId, 10));
    setSelectedKit(kit || null);
    setForm(prev => ({ 
      ...prev, 
      kit_id: kitId, 
      quantity: 1, 
      unit_price: kit?.kit?.selling_price || 0,
      discount: 0 
    }));
    setStudentSearch('');
    setSelectedStudent(null);
    setExistingAssignments(0);
  };

  const checkExistingAssignments = async (studentId, kitId) => {
    try {
      const res = await coachGet(`/coach/inventory/kits/student-assignments?student_id=${studentId}&kit_id=${kitId}`);
      const activeAssignments = (res.data || []).filter(a => a.status === 'ACTIVE');
      setExistingAssignments(activeAssignments.length);
    } catch {
      setExistingAssignments(0);
    }
  };

  const handleStudentChange = (studentId) => {
    const student = myStudents.find(s => s.student_id === studentId);
    setForm({ ...form, student_id });
    setSelectedStudent(student);
    setStudentSearch('');
    if (studentId && selectedKit) {
      checkExistingAssignments(studentId, selectedKit.kit_id);
    } else {
      setExistingAssignments(0);
    }
  };

  const calculateFinalAmount = () => {
    const qty = parseInt(form.quantity) || 1;
    const price = parseFloat(form.unit_price) || 0;
    const discount = parseFloat(form.discount) || 0;
    return Math.max(0, (price * qty) - discount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id) { flash('Please select a student', 'error'); return; }
    if (!form.kit_id) { flash('Please select a kit', 'error'); return; }
    if (!form.quantity || form.quantity < 1) { flash('Quantity must be at least 1', 'error'); return; }
    if (selectedKit && form.quantity > selectedKit.remaining_qty) {
      flash(`Cannot exceed your remaining stock (${selectedKit.remaining_qty})`, 'error'); return;
    }

    setSubmitting(true);
    try {
      // Use coach-specific assignment endpoint
      const kitId = selectedKit?.kit_id || form.kit_id;
      await coachPost(`/coach/inventory/kits/${kitId}/assign`, {
        student_id: parseInt(form.student_id, 10),
        quantity: parseInt(form.quantity) || 1,
        unit_price: parseFloat(form.unit_price) || selectedKit?.kit?.selling_price || 0,
        discount: parseFloat(form.discount) || 0,
        issue_date: form.issue_date,
        payment_mode: form.payment_status === 'PAID' ? 'PAID' : 'FEE',
        remarks: form.remarks,
      });
      flash('Kit assigned to student successfully!');
      setForm({ student_id: '', kit_id: '', quantity: 1, unit_price: 0, discount: 0, payment_status: 'UNPAID', remarks: '', issue_date: new Date().toISOString().split('T')[0] });
      setSelectedKit(null);
      setStudentSearch('');
      setExistingAssignments(0);
      loadData(); // refresh remaining qty
    } catch (err) {
      flash(err.message || 'Failed to assign kit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Assign Kit to Student</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Assign kits from your allocation to students in your batches.</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">

          {myKits.length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-center gap-3 text-sm text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>You have no kits with available stock. Ask admin to assign kits to you.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student Search
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Name, ID, Mobile, or Admission Number..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
              
              {selectedStudent && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs">{selectedStudent.name}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-500">ID: #{selectedStudent.student_id} | {selectedStudent.batch?.name || 'No Batch'} | {selectedStudent.phone || 'No Mobile'}</div>
                    </div>
                    <button type="button" onClick={() => { setSelectedStudent(null); setForm({ ...form, student_id: '' }); setExistingAssignments(0); }} className="text-rose-500 hover:text-rose-700 text-[10px] font-semibold">Clear</button>
                  </div>
                </div>
              )}
              
              {studentSearch && !selectedStudent && filteredStudents.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-slate-950 mb-2">
                  {filteredStudents.map(s => (
                    <div key={s.student_id} onClick={() => handleStudentChange(s.student_id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{s.student_id} | {s.batch?.name || 'No Batch'} | {s.phone || 'No Mobile'}</div>
                    </div>
                  ))}
                </div>
              )}
              {myStudents.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No students found in your batches.</p>
              )}
            </div>

            {/* Kit Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Kit *
              </label>
              <select
                value={form.kit_id}
                onChange={e => handleKitSelect(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                required
              >
                <option value="">— Select Kit —</option>
                {myKits.map(k => (
                  <option key={k.id || k.kit_id} value={k.kit_id || k.kit?.kit_id}>
                    {k.kit?.name} ({k.kit?.sport?.name}) — Remaining: {k.remaining_qty} — ₹{Number(k.kit?.selling_price || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Kit info box */}
            {selectedKit && (
              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center border-b border-indigo-200 dark:border-indigo-900/30 pb-2">
                  <div><div className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Total</div><div className="font-bold text-slate-900 dark:text-white">{selectedKit.kit?.total_qty || 0}</div></div>
                  <div><div className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Available</div><div className="font-bold text-emerald-600 dark:text-emerald-400">{selectedKit.remaining_qty || 0}</div></div>
                  <div><div className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Assigned</div><div className="font-bold text-slate-900 dark:text-white">{selectedKit.quantity || 0}</div></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Kit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedKit.kit?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Sport:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedKit.kit?.sport?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Your remaining stock:</span>
                  <span className={`font-black ${selectedKit.remaining_qty <= 1 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {selectedKit.remaining_qty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Kit price:</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{Number(selectedKit.kit?.selling_price || 0)}</span>
                </div>
              </div>
            )}

            {existingAssignments > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400">ℹ️ Info:</span> Student already has {existingAssignments} × {selectedKit?.kit?.name} assigned.
              </div>
            )}

            {/* Quantity and Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedKit?.remaining_qty || 1}
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={e => setForm({ ...form, unit_price: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount (₹) <span className="text-xs font-normal text-slate-500">(Optional)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={e => setForm({ ...form, discount: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Final Amount Display */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Final Amount:</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">₹{calculateFinalAmount().toFixed(2)}</span>
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={e => setForm({ ...form, issue_date: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Payment Status</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'PAID', label: 'Paid', desc: 'Creates a payment record & notifies parent', icon: CheckCircle, color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                  { val: 'UNPAID', label: 'Unpaid', desc: 'Added to student fees & notifies parent', icon: DollarSign, color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm({ ...form, payment_status: opt.val })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.payment_status === opt.val
                        ? `${opt.color} shadow-sm`
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <opt.icon className={`w-4 h-4 ${opt.val === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks (Optional)</label>
              <textarea
                value={form.remarks}
                onChange={e => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                placeholder="Any notes about this assignment…"
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || myKits.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Assigning…</>
              ) : (
                <><Plus className="w-4 h-4" /> Assign Kit to Student</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── ASSIGNMENT HISTORY TAB ───────────────────────────────────────────────────
function AssignmentHistoryTab() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [message, flash] = useFlash();
  const [expandedStudents, setExpandedStudents] = useState({});

  // Filters
  const [filterStudent, setFilterStudent] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKit, setFilterKit] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coachGet('/coach/inventory/kits/student-assignments');
      setAssignments(res.data || []);
    } catch (err) {
      flash(err.message || 'Failed to load assignment history', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkPaid = async (item) => {
    if (!window.confirm(`Mark payment PAID for ${item.student?.name}?`)) return;
    try {
      await coachPatch(`/coach/inventory/kits/student-assignments/${item.assignment_id}/payment`, { payment_method: 'cash' });
      flash('Payment marked as paid!');
      loadData();
    } catch (err) { flash(err.message || 'Failed', 'error'); }
  };

  const filtered = assignments.filter(a => {
    if (filterStudent && !a.student?.name?.toLowerCase().includes(filterStudent.toLowerCase()) && !a.student?.student_id?.toString().includes(filterStudent)) return false;
    if (filterPayment && a.payment_status !== filterPayment) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterKit && a.kit?.name !== filterKit) return false;
    return true;
  });

  // Group by student
  const grouped = {};
  filtered.forEach(a => {
    const sid = a.student?.student_id || 'unknown';
    if (!grouped[sid]) grouped[sid] = { student: a.student, assignments: [] };
    grouped[sid].assignments.push(a);
  });
  const groupedList = Object.values(grouped);

  const uniqueKits = [...new Set(assignments.map(a => a.kit?.name).filter(Boolean))];
  const hasFilters = filterStudent || filterPayment || filterStatus || filterKit;

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <FlashBanner message={message} />
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Assignment History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All kit assignments you have made to students.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{groupedList.length} students · {filtered.length} assignments</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterStudent(''); setFilterPayment(''); setFilterStatus(''); setFilterKit(''); }}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student name or ID…"
              value={filterStudent}
              onChange={e => setFilterStudent(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
            />
          </div>
          <select value={filterKit} onChange={e => setFilterKit(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Kits</option>
            {uniqueKits.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">Any Payment</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">Any Status</option>
            <option value="ACTIVE">Active</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      {groupedList.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Activity className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
            {hasFilters ? 'No Matches Found' : 'No Assignment History'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {hasFilters ? 'Try adjusting or clearing filters.' : 'Kit assignments you make will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedList.map(({ student, assignments: studentAssignments }) => {
            const sid = student?.student_id || 'unknown';
            const isExpanded = expandedStudents[sid];
            const activeCount = studentAssignments.filter(a => a.status === 'ACTIVE').length;
            const unpaidCount = studentAssignments.filter(a => a.payment_status === 'UNPAID').length;

            return (
              <motion.div key={sid} layout className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                  onClick={() => setExpandedStudents(prev => ({ ...prev, [sid]: !prev[sid] }))}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-sm">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{student?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground font-mono">#{student?.student_id}</span>
                      {student?.batch?.name && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {student.batch.name}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 mt-1">
                      {studentAssignments.length} kit assignment{studentAssignments.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                        {activeCount} Active
                      </span>
                    )}
                    {unpaidCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse">
                        {unpaidCount} Unpaid
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                              <th className="px-5 py-3">Kit</th>
                              <th className="px-5 py-3">Sport</th>
                              <th className="px-5 py-3">Issued</th>
                              <th className="px-5 py-3">Amount</th>
                              <th className="px-5 py-3">Payment</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Remarks</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {studentAssignments.map(item => (
                              <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{item.kit?.name || '—'}</td>
                                <td className="px-5 py-3 text-slate-500">{item.kit?.sport?.name || '—'}</td>
                                <td className="px-5 py-3">{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '—'}</td>
                                <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">₹{Number(item.kit?.selling_price || 0)}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'}`}>
                                    {item.payment_status}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3 max-w-[120px] truncate text-muted-foreground" title={item.remarks || ''}>
                                  {item.remarks || <span className="italic">—</span>}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  {item.payment_status === 'UNPAID' && item.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => handleMarkPaid(item)}
                                      className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                  {item.status === 'RETURNED' && (
                                    <span className="text-[10px] text-slate-400 italic">Returned</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CoachSportsKitsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5"
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Inventory</span>
            <span className="opacity-40">/</span>
            <span className="font-semibold text-foreground">Sports Kits</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sports Kits</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            View assigned kits · Distribute to students · Track payments
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">View-only · Admin-assigned kits</span>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1 gap-1 border border-slate-200 dark:border-slate-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/40'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'my-kits'   && <MyKitsTab />}
          {activeTab === 'assign'    && <AssignToStudentTab />}
          {activeTab === 'history'   && <AssignmentHistoryTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
