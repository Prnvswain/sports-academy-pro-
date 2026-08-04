import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Trash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  UserCheck,
  Trophy,
  Activity,
  ArrowLeft,
  Calendar,
  FileSpreadsheet,
  Download,
  AlertTriangle
} from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPut, adminDelete, adminPatch } from '../../api/client';

const CATEGORIES = ['Ball', 'Bat', 'Racket', 'Net', 'Cone', 'Jersey', 'Gloves', 'Mat', 'Stumps', 'Others'];

export default function SportsKitsPanel() {
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [kits, setKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [dashboard, setDashboard] = useState({
    totalKits: 0,
    availableKits: 0,
    assignedKits: 0,
    outOfStockKits: 0,
    todayAssignments: 0,
    pendingKitPayments: 0,
    kitRevenue: 0,
    mostAssignedSport: 'N/A'
  });

  // Navigation sub-tabs inside Sports Kits
  const [kitTab, setKitTab] = useState('sports'); // sports, dashboard, reports

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Forms state
  const [kitForm, setKitForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    total_qty: 0,
    selling_price: 0,
    items: [] // array of { name, qty, price }
  });
  
  const [assignForm, setAssignForm] = useState({
    student_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    remarks: '',
    payment_mode: 'FEE', // FEE or PAID
    payment_method: 'cash'
  });

  // Builders State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Others');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Search & Filters
  const [sportSearch, setSportSearch] = useState('');
  const [kitSearch, setKitSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('all'); // all, pending_payments, paid_payments, current_stock

  // Message notifications
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // ─── DATA LOADERS ────────────────────────────────────────────────────────

  const loadSports = useCallback(async () => {
    // Temporarily disabled - endpoint not available yet
    setSports([]);
    return;
    // try {
    //   const res = await adminGet('/admin/inventory/kits/sports');
    //   setSports(res.data || []);
    // } catch (err) {
    //   if (err.status === 404 || err.response?.status === 404) {
    //     setSports([]);
    //   } else {
    //     console.error(err);
    //     flashMessage(err.message || 'Failed to load sports catalog', 'error');
    //   }
    // }
  }, []);

  const loadDashboard = useCallback(async () => {
    // Temporarily disabled - endpoint not available yet
    setDashboard({});
    return;
    // try {
    //   const res = await adminGet('/admin/inventory/kits/dashboard');
    //   setDashboard(res.data || {});
    // } catch (err) {
    //   if (err.status === 404 || err.response?.status === 404) {
    //     setDashboard({});
    //   } else {
    //     console.error(err);
    //   }
    // }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await adminGet('/admin/students');
      setStudents(res.data?.students || res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSports(), loadDashboard(), loadStudents()]);
    setLoading(false);
  }, [loadSports, loadDashboard, loadStudents]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Load kits when a sport is selected
  const selectSport = async (sport) => {
    setSelectedSport(sport);
    setSelectedKit(null);
    try {
      const res = await adminGet(`/admin/inventory/kits?sport_id=${sport.sport_id}`);
      setKits(res.data || []);
    } catch (err) {
      flashMessage('Failed to load kits for selected sport', 'error');
    }
  };

  // Refresh kits list
  const refreshKits = async () => {
    if (!selectedSport) return;
    try {
      const res = await adminGet(`/admin/inventory/kits?sport_id=${selectedSport.sport_id}`);
      setKits(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Load assignments for a selected kit
  const loadKitAssignments = async (kit) => {
    setSelectedKit(kit);
    try {
      const res = await adminGet(`/admin/inventory/kits/assignments?kit_id=${kit.kit_id}`);
      setAssignments(res.data || []);
    } catch (err) {
      flashMessage('Failed to load assignments for this kit', 'error');
    }
  };

  // ─── KIT CRUD OPERATIONS ───────────────────────────────────────────

  const openAddKit = () => {
    setEditingKit(null);
    setKitForm({
      name: '',
      description: '',
      status: 'ACTIVE',
      total_qty: 0,
      selling_price: 0,
      items: []
    });
    setNewItemName('');
    setNewItemCategory('Others');
    setNewItemQty(1);
    setNewItemPrice(0);
    setShowAddEditModal(true);
  };

  const openEditKit = (kit) => {
    setEditingKit(kit);
    setKitForm({
      name: kit.name,
      description: kit.description || '',
      status: kit.status || 'ACTIVE',
      total_qty: kit.total_qty,
      selling_price: Number(kit.selling_price),
      items: JSON.parse(kit.items || '[]')
    });
    setNewItemName('');
    setNewItemCategory('Others');
    setNewItemQty(1);
    setNewItemPrice(0);
    setShowAddEditModal(true);
  };

  const addItemToKitForm = () => {
    if (!newItemName.trim()) {
      flashMessage('Item name is required', 'error');
      return;
    }
    const qtyVal = parseInt(newItemQty, 10);
    const priceVal = parseFloat(newItemPrice);
    
    if (isNaN(qtyVal) || qtyVal <= 0) {
      flashMessage('Item quantity must be greater than zero', 'error');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      flashMessage('Item unit price cannot be negative', 'error');
      return;
    }

    const updatedItems = [
      ...kitForm.items,
      { name: newItemName.trim(), category: newItemCategory, qty: qtyVal, price: priceVal }
    ];
    
    // Auto-calculate base price & selling price if not overridden
    const newBase = updatedItems.reduce((acc, item) => acc + item.qty * item.price, 0);
    
    setKitForm({
      ...kitForm,
      items: updatedItems,
      selling_price: editingKit ? kitForm.selling_price : newBase
    });

    setNewItemName('');
    setNewItemCategory('Others');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const removeItemFromKitForm = (idx) => {
    const updatedItems = kitForm.items.filter((_, i) => i !== idx);
    const newBase = updatedItems.reduce((acc, item) => acc + item.qty * item.price, 0);
    
    setKitForm({
      ...kitForm,
      items: updatedItems,
      selling_price: editingKit ? kitForm.selling_price : newBase
    });
  };

  const calculateFormBasePrice = () => {
    return kitForm.items.reduce((acc, item) => acc + item.qty * item.price, 0);
  };

  const submitKitForm = async (e) => {
    e.preventDefault();
    if (!kitForm.name.trim()) {
      flashMessage('Kit name is required', 'error');
      return;
    }

    if (kitForm.total_qty < 0) {
      flashMessage('Total sets available cannot be negative', 'error');
      return;
    }

    if (kitForm.selling_price < 0) {
      flashMessage('Selling price cannot be negative', 'error');
      return;
    }

    if (kitForm.items.length === 0) {
      flashMessage('Do not allow kit creation without at least one item', 'error');
      return;
    }

    const isDuplicate = kits.some(k => 
      k.name.toLowerCase().trim() === kitForm.name.toLowerCase().trim() &&
      k.kit_id !== editingKit?.kit_id
    );
    if (isDuplicate) {
      flashMessage('Prevent duplicate kit names within the same sport', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...kitForm,
        sport_id: selectedSport.sport_id,
        items: JSON.stringify(kitForm.items)
      };

      if (editingKit) {
        await adminPut(`/admin/inventory/kits/${editingKit.kit_id}`, payload);
        flashMessage('Sports kit updated successfully!');
      } else {
        await adminPost('/admin/inventory/kits', payload);
        flashMessage('Sports kit built successfully!');
      }
      setShowAddEditModal(false);
      refreshKits();
      loadDashboard();
    } catch (err) {
      flashMessage(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKit = async (kit) => {
    if (kit.assigned_qty > 0) {
      flashMessage('Cannot delete kit with active assignments!', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${kit.name}"?`)) {
      return;
    }

    try {
      await adminDelete(`/admin/inventory/kits/${kit.kit_id}`);
      flashMessage('Sports kit deleted successfully');
      refreshKits();
      loadDashboard();
    } catch (err) {
      flashMessage(err.message || 'Failed to delete kit', 'error');
    }
  };

  // ─── ASSIGN & RETURN OPERATIONS ─────────────────────────────────────

  const openAssignModal = (kit) => {
    if (kit.available_qty <= 0) {
      flashMessage('This kit is out of stock!', 'error');
      return;
    }
    setSelectedKit(kit);
    setAssignForm({
      student_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      remarks: '',
      payment_mode: 'FEE',
      payment_method: 'cash'
    });
    setShowAssignModal(true);
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.student_id) {
      flashMessage('Please select a student', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await adminPost(`/admin/inventory/kits/${selectedKit.kit_id}/assign`, {
        student_id: parseInt(assignForm.student_id, 10),
        issue_date: assignForm.issue_date,
        expected_return_date: assignForm.expected_return_date || null,
        remarks: assignForm.remarks,
        payment_mode: assignForm.payment_mode,
        payment_method: assignForm.payment_method
      });

      flashMessage('Kit assigned successfully!');
      setShowAssignModal(false);
      refreshKits();
      if (selectedKit) {
        loadKitAssignments(selectedKit);
      }
      loadDashboard();
    } catch (err) {
      flashMessage(err.message || 'Failed to assign kit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnKit = async (assignRecord) => {
    if (!window.confirm(`Mark kit returned for student "${assignRecord.student?.name}"?`)) {
      return;
    }

    try {
      await adminPatch(`/admin/inventory/kits/assignments/${assignRecord.assignment_id}/return`, {});
      flashMessage('Kit returned successfully!');
      refreshKits();
      if (selectedKit) {
        loadKitAssignments(selectedKit);
      }
      loadDashboard();
    } catch (err) {
      flashMessage(err.message || 'Failed to return kit', 'error');
    }
  };

  const handleMarkPaymentPaid = async (assignRecord) => {
    if (!window.confirm(`Mark payment as PAID for "${assignRecord.student?.name}"?`)) {
      return;
    }

    try {
      await adminPatch(`/admin/inventory/kits/assignments/${assignRecord.assignment_id}/payment`, {
        payment_method: 'cash'
      });
      flashMessage('Kit payment status marked as Paid!');
      if (selectedKit) {
        loadKitAssignments(selectedKit);
      }
      loadDashboard();
    } catch (err) {
      flashMessage(err.message || 'Failed to update payment status', 'error');
    }
  };

  // ─── REPORTS GENERATOR ──────────────────────────────────────────────

  const [reportsData, setReportsData] = useState({ kits: [], assignments: [] });
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await adminGet('/admin/inventory/kits/reports');
      setReportsData(res.data || { kits: [], assignments: [] });
    } catch (err) {
      flashMessage('Failed to load reports ledger', 'error');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (kitTab === 'reports') {
      fetchReports();
    }
  }, [kitTab, fetchReports]);

  const getFilteredReportAssignments = () => {
    const list = reportsData.assignments || [];
    if (reportFilter === 'pending_payments') {
      return list.filter(a => a.payment_status === 'UNPAID');
    }
    if (reportFilter === 'paid_payments') {
      return list.filter(a => a.payment_status === 'PAID');
    }
    return list;
  };

  const exportReportCSV = () => {
    const list = getFilteredReportAssignments();
    if (list.length === 0) {
      flashMessage('No assignment data to export', 'error');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Sport,Kit Name,Issue Date,Return Date,Return Status,Payment Mode,Payment Status,Price\n";

    list.forEach((a) => {
      const studentName = `"${(a.student?.name || '').replace(/"/g, '""')}"`;
      const sportName = `"${(a.kit?.sport?.name || '').replace(/"/g, '""')}"`;
      const kitName = `"${(a.kit?.name || '').replace(/"/g, '""')}"`;
      const issueDate = a.issue_date ? new Date(a.issue_date).toLocaleDateString() : '';
      const returnDate = a.return_date ? new Date(a.return_date).toLocaleDateString() : 'N/A';
      const status = a.status;
      const paymentMode = a.payment_mode;
      const paymentStatus = a.payment_status;
      const price = a.kit?.selling_price || 0;

      csvContent += `${studentName},${sportName},${kitName},${issueDate},${returnDate},${status},${paymentMode},${paymentStatus},${price}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sports_kit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters sports search
  const filteredSports = sports.filter(s =>
    s.name.toLowerCase().includes(sportSearch.toLowerCase())
  );

  // Filters kits search
  const filteredKitsList = kits.filter(k =>
    k.name.toLowerCase().includes(kitSearch.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Notifications system alerts */}
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
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-medium text-sm text-foreground">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local tab bar */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 border border-slate-200 dark:border-slate-700 max-w-md">
        {[
          { id: 'sports', label: 'Sports Kits Catalog', icon: Trophy },
          { id: 'dashboard', label: 'Dashboard Cards', icon: Activity },
          { id: 'reports', label: 'Reports & Ledger', icon: FileSpreadsheet }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setKitTab(tab.id);
              setSelectedSport(null);
              setSelectedKit(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              kitTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT: SPORTS CATALOG ───────────────────────────────────── */}
      {kitTab === 'sports' && (
        <div className="space-y-6">
          {!selectedSport ? (
            /* Sports list selection (Section 1) */
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-foreground">Sports List Catalog</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Click a sport to open and manage its kits inventory.</p>
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search sport name..."
                    value={sportSearch}
                    onChange={(e) => setSportSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {filteredSports.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Trophy className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
                  <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">No active sports found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Make sure sports are registered and set active in Sports Catalog page.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredSports.map((sport) => (
                    <motion.div
                      key={sport.sport_id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      onClick={() => selectSport(sport)}
                      className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col items-center justify-center text-center relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
                        {sport.icon || '🏅'}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{sport.name}</h4>
                      <div className="grid grid-cols-3 gap-1 mt-3 w-full border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[9px] text-center">
                        <div>
                          <div className="text-slate-400 font-bold uppercase tracking-tight">Kits</div>
                          <div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.totalKits || 0}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-bold uppercase tracking-tight">Available</div>
                          <div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.availableStock || 0}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-bold uppercase tracking-tight">Assigned</div>
                          <div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.assignedStock || 0}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : !selectedKit ? (
            /* Kits List for Sport (Section 2) */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSport(null)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    <span>{selectedSport.name}</span> Kits Manager
                  </h2>
                  <p className="text-xs text-muted-foreground">Build, track, assign and manage multiple sets of kits for this sport.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search kits..."
                    value={kitSearch}
                    onChange={(e) => setKitSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={openAddKit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Build New Kit
                </button>
              </div>

              {filteredKitsList.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                  <Package className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
                  <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">No kits built yet</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 mb-4">Get started by building a kit for {selectedSport.name}.</p>
                  <button
                    type="button"
                    onClick={openAddKit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" /> Create First Kit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredKitsList.map((kit) => {
                    const isOutOfStock = kit.available_qty === 0;
                    return (
                      <div
                        key={kit.kit_id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{kit.name}</h3>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                                kit.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {kit.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">
                                ₹{Number(kit.selling_price)}
                              </span>
                              <div className="text-[10px] text-slate-450 font-semibold">
                                Base: ₹{JSON.parse(kit.items || '[]').reduce((acc, item) => acc + (item.qty * item.price), 0)}
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">{kit.description || 'No description listed'}</p>

                          {/* Stocks grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-800/60 text-center">
                            <div>
                              <div className="text-[10px] text-muted-foreground font-semibold">Total</div>
                              <div className="text-sm font-bold mt-0.5 text-slate-800 dark:text-white">{kit.total_qty}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground font-semibold">Available</div>
                              <div className={`text-sm font-bold mt-0.5 ${isOutOfStock ? 'text-rose-500 font-extrabold animate-pulse' : 'text-slate-800 dark:text-white'}`}>
                                {kit.available_qty}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground font-semibold">Assigned</div>
                              <div className="text-sm font-bold mt-0.5 text-slate-800 dark:text-white">{kit.assigned_qty}</div>
                            </div>
                          </div>
                        </div>

                        {/* Actions footer */}
                        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => loadKitAssignments(kit)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:underline"
                          >
                            View Members
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditKit(kit)}
                              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition"
                              title="Edit Kit Items & Selling Price"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKit(kit)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                              title="Delete Kit"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openAssignModal(kit)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Kit Details & Assigned Students (Section 7) */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedKit(null)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-extrabold text-foreground">{selectedKit.name}</h2>
                  <p className="text-xs text-muted-foreground">Assigned students and active ledger logs for this kit.</p>
                </div>
              </div>

              {/* Members table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Assigned Students</h3>
                </div>

                {assignments.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs italic">
                    This kit has not been assigned to any student yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="p-4">Student</th>
                          <th className="p-4">Batch</th>
                          <th className="p-4">Issue Date</th>
                          <th className="p-4">Payment mode</th>
                          <th className="p-4">Payment status</th>
                          <th className="p-4">Kit Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {assignments.map((item) => (
                          <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                            <td className="p-4 font-bold flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold shrink-0">
                                {item.student?.name?.charAt(0) || 'S'}
                              </div>
                              {item.student?.name}
                            </td>
                            <td className="p-4">{item.student?.batch?.name || 'N/A'}</td>
                            <td className="p-4">{new Date(item.issue_date).toLocaleDateString()}</td>
                            <td className="p-4">
                              <span className="font-semibold uppercase text-[10px]">
                                {item.payment_mode === 'FEE' ? 'Add to Fees' : 'Paid Direct'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.payment_status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 animate-pulse'
                              }`}>
                                {item.payment_status}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'ACTIVE'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              {item.payment_status === 'UNPAID' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaymentPaid(item)}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 transition"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {item.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => handleReturnKit(item)}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition"
                                >
                                  Return Kit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: DASHBOARD CARDS ──────────────────────────────────── */}
      {kitTab === 'dashboard' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Sports Kits Analytics</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Key performance indicators and metrics tracking sports kits transactions.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Kits Built', val: dashboard.totalKits, icon: Package, col: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400' },
              { label: 'Available Kits Stock', val: dashboard.availableKits, icon: Layers, col: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' },
              { label: 'Assigned Kits Stock', val: dashboard.assignedKits, icon: UserCheck, col: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400' },
              { label: 'Out of Stock Kits', val: dashboard.outOfStockKits, icon: AlertTriangle, col: dashboard.outOfStockKits > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-455 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/30' }
            ].map((kpi, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm ${kpi.col}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4 opacity-80" />
                </div>
                <div className="mt-3 text-3xl font-extrabold tracking-tight">{kpi.val}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Today's Assignments</h4>
              <div className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">{dashboard.todayAssignments}</div>
              <p className="text-[10px] text-muted-foreground mt-1.5">New kit assignments dispatched since midnight.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Pending kit Payments</h4>
              <div className="mt-3 text-4xl font-extrabold text-amber-600 dark:text-amber-400">{dashboard.pendingKitPayments}</div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Awaiting billing settlements from parent profiles.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Total Kit Revenue</h4>
              <div className="mt-3 text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{dashboard.kitRevenue}</div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Centralized revenue from paid direct kit transactions.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm max-w-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Most Assigned Sport</h4>
              <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{dashboard.mostAssignedSport}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0 font-extrabold">🏅</div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: REPORTS & LEDGER ─────────────────────────────────── */}
      {kitTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">Sports Kits Ledger & Reports</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Audit history, stock reports, and custom student kit ledgers.</p>
            </div>
            <button
              type="button"
              onClick={exportReportCSV}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV Report
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
            <label className="text-xs font-bold text-muted-foreground">Filter Ledger:</label>
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-slate-900 dark:text-white font-bold"
            >
              <option value="all">All Assignments</option>
              <option value="pending_payments">Pending Payments Only</option>
              <option value="paid_payments">Paid Payments Only</option>
            </select>
          </div>

          {reportsLoading ? (
            <Loader />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-4">Student</th>
                      <th className="p-4">Sport</th>
                      <th className="p-4">Kit Name</th>
                      <th className="p-4">Issue Date</th>
                      <th className="p-4">Return Status</th>
                      <th className="p-4">Payment status</th>
                      <th className="p-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {getFilteredReportAssignments().length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-muted-foreground italic">No matching records inside this ledger filter.</td>
                      </tr>
                    ) : (
                      getFilteredReportAssignments().map((item) => (
                        <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                          <td className="p-4 font-bold">{item.student?.name}</td>
                          <td className="p-4">{item.kit?.sport?.name}</td>
                          <td className="p-4">{item.kit?.name}</td>
                          <td className="p-4">{new Date(item.issue_date).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'ACTIVE'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'
                            }`}>
                              {item.payment_status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold">₹{Number(item.kit?.selling_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT KIT BUILDER (Section 3 & 4) ──────────────────── */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base">
                {editingKit ? `Edit "${editingKit.name}"` : 'Build New Sports Kit'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitKitForm} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Kit Name</label>
                  <input
                    type="text"
                    required
                    value={kitForm.name}
                    onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. Beginner Kit, Premium Set"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Total Sets Available</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={kitForm.total_qty}
                    onChange={(e) => setKitForm({ ...kitForm, total_qty: parseInt(e.target.value, 10) || 0 })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Description</label>
                <textarea
                  rows="2"
                  value={kitForm.description}
                  onChange={(e) => setKitForm({ ...kitForm, description: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
                  placeholder="Items list details or specific notes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Status</label>
                  <select
                    value={kitForm.status}
                    onChange={(e) => setKitForm({ ...kitForm, status: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Final Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={kitForm.selling_price}
                    onChange={(e) => setKitForm({ ...kitForm, selling_price: parseFloat(e.target.value) || 0 })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white font-bold"
                  />
                  <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850/60 space-y-1.5 text-[10px] w-full">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Base Cost:</span>
                      <span className="font-bold text-slate-800 dark:text-white">₹{calculateFormBasePrice()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Profit / Loss:</span>
                      <span className={`font-bold ${
                        (kitForm.selling_price - calculateFormBasePrice()) > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : (kitForm.selling_price - calculateFormBasePrice()) < 0 
                            ? 'text-rose-600 dark:text-rose-450 font-extrabold animate-pulse' 
                            : 'text-slate-500'
                      }`}>
                        {(kitForm.selling_price - calculateFormBasePrice()) > 0 
                          ? `+₹${kitForm.selling_price - calculateFormBasePrice()} (Profit)` 
                          : (kitForm.selling_price - calculateFormBasePrice()) < 0 
                            ? `-₹${Math.abs(kitForm.selling_price - calculateFormBasePrice())} (Loss)` 
                            : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Final Selling Price:</span>
                      <span className="text-slate-900 dark:text-white text-xs font-black">₹{kitForm.selling_price}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Builder Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="font-bold text-slate-950 dark:text-white">Kit Items List</h4>
                
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Item Name</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Bat, pads, water bottle"
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none font-bold"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addItemToKitForm}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-2.5 rounded-xl text-xs"
                  >
                    Add
                  </button>
                </div>

                {/* Built items catalog */}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {kitForm.items.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground italic text-[11px]">No items added to this kit yet.</div>
                  ) : (
                    kitForm.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{item.name} ({item.category || 'Others'})</span>
                          <span className="text-[10px] text-slate-400 font-semibold ml-2">Qty: {item.qty} × ₹{item.price}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">₹{item.qty * item.price}</span>
                          <button
                            type="button"
                            onClick={() => removeItemFromKitForm(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Kit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL: ASSIGN SPORTS KIT (Section 5) ─────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base">Assign: {selectedKit.name}</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitAssignment} className="p-6 space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Search & Select Student</label>
                <select
                  required
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                >
                  <option value="">Select student…</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name} ({s.student_id} - {s.batch?.name || 'No Batch'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={assignForm.issue_date}
                    onChange={(e) => setAssignForm({ ...assignForm, issue_date: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Expected Return (optional)</label>
                  <input
                    type="date"
                    value={assignForm.expected_return_date}
                    onChange={(e) => setAssignForm({ ...assignForm, expected_return_date: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Payment Mode</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="payment_mode"
                      value="FEE"
                      checked={assignForm.payment_mode === 'FEE'}
                      onChange={() => setAssignForm({ ...assignForm, payment_mode: 'FEE' })}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="font-bold text-slate-800 dark:text-white">Add to Fees</div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="payment_mode"
                      value="PAID"
                      checked={assignForm.payment_mode === 'PAID'}
                      onChange={() => setAssignForm({ ...assignForm, payment_mode: 'PAID' })}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="font-bold text-slate-800 dark:text-white">Paid Now</div>
                  </label>
                </div>
              </div>

              {assignForm.payment_mode === 'PAID' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-350">Payment Method</label>
                  <select
                    value={assignForm.payment_method}
                    onChange={(e) => setAssignForm({ ...assignForm, payment_method: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI / Online Transfer</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-350">Remarks</label>
                <textarea
                  rows="2"
                  value={assignForm.remarks}
                  onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="Any issuance remarks or notes..."
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Kit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
