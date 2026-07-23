import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Edit2,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Package,
  Layers,
  Truck,
  CheckCircle,
  Download,
  AlertCircle,
  Clock,
  Notebook
} from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPut, adminPatch } from '../../api/client';

const CATEGORIES = ['Ball', 'Bat', 'Racket', 'Net', 'Cone', 'Jersey', 'Gloves', 'Mat', 'Stumps', 'Other'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [sports, setSports] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dashboard, setDashboard] = useState({
    totalItems: 0,
    totalStock: 0,
    assignedStock: 0,
    availableStock: 0,
    pendingRequests: 0,
    lowStockAlerts: 0,
    damagedItems: 0
  });

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('catalog'); // catalog, assignments, requests, reports

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Message notifications
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Ball',
    sport_id: '',
    brand: '',
    model_name: '',
    purchase_date: '',
    purchase_price: '',
    supplier: '',
    total_qty: '',
    min_stock_alert: '5',
    condition: 'New',
    notes: ''
  });
  const [imageFile, setImageFile] = useState(null);

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetItem, setAssignTargetItem] = useState(null);
  const [assignForm, setAssignForm] = useState({
    coach_id: '',
    qty: 1,
    notes: ''
  });

  // Return Modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTargetAssignment, setReturnTargetAssignment] = useState(null);
  const [returnForm, setReturnForm] = useState({
    qty: 1,
    notes: ''
  });

  // Action Request Modal
  const [showRequestActionModal, setShowRequestActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestActionForm, setRequestActionForm] = useState({
    status: 'Approved', // Approved, Rejected, Ordered, Delivered
    remarks: ''
  });

  // Reports
  const [selectedReportType, setSelectedReportType] = useState('current_stock');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Helper alert flash
  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // ─── DATA LOADING FLOWS ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, dashboardRes, coachesRes, sportsRes, assignmentsRes, requestsRes] = await Promise.all([
        adminGet('/admin/inventory'),
        adminGet('/admin/inventory/dashboard'),
        adminGet('/admin/coaches'),
        adminGet('/admin/sports'),
        adminGet('/admin/inventory/assignments'),
        adminGet('/admin/inventory/requests')
      ]);

      setItems(itemsRes?.data || []);
      setDashboard(dashboardRes?.data || dashboardRes || {});
      setCoaches(coachesRes?.data || coachesRes || []);
      setSports(sportsRes?.data || sportsRes || []);
      setAssignments(assignmentsRes?.data || []);
      setRequests(requestsRes?.data || []);
    } catch (err) {
      console.error(err);
      flashMessage(err.message || 'Failed to fetch inventory configurations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load report data when report tab active or type changes
  useEffect(() => {
    if (activeTab === 'reports') {
      const loadReport = async () => {
        setReportLoading(true);
        try {
          const res = await adminGet(`/admin/inventory/reports?type=${selectedReportType}`);
          setReportData(res?.data || []);
        } catch (err) {
          flashMessage(err.message || 'Failed to fetch report data', 'error');
        } finally {
          setReportLoading(false);
        }
      };
      loadReport();
    }
  }, [activeTab, selectedReportType]);

  // ─── ADD/EDIT ITEM FLOW ───────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Ball',
      sport_id: '',
      brand: '',
      model_name: '',
      purchase_date: '',
      purchase_price: '',
      supplier: '',
      total_qty: '10',
      min_stock_alert: '5',
      condition: 'New',
      notes: ''
    });
    setImageFile(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name || '',
      category: item.category || 'Ball',
      sport_id: item.sport_id || '',
      brand: item.brand || '',
      model_name: item.model_name || '',
      purchase_date: item.purchase_date ? item.purchase_date.substring(0, 10) : '',
      purchase_price: item.purchase_price || '',
      supplier: item.supplier || '',
      total_qty: item.total_qty || '0',
      min_stock_alert: item.min_stock_alert || '0',
      condition: item.condition || 'New',
      notes: item.notes || ''
    });
    setImageFile(null);
    setShowAddEditModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(itemForm).forEach((key) => {
      if (itemForm[key] !== '') {
        formData.append(key, itemForm[key]);
      }
    });
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingItem) {
        await adminPut(`/admin/inventory/${editingItem.item_id}`, formData);
        flashMessage('Inventory item updated successfully!');
      } else {
        await adminPost('/admin/inventory', formData);
        flashMessage('New inventory item added successfully!');
      }
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to save inventory item', 'error');
    }
  };

  // ─── STOCK ADJUSTMENT FLOW (+ / - Controls) ───────────────────────────────

  const handleAdjustStock = async (itemId, change) => {
    try {
      await adminPost(`/admin/inventory/${itemId}/stock`, {
        quantity_change: change,
        notes: `Quick inline stock adjustment: ${change > 0 ? '+' : ''}${change}`
      });
      // Refresh dashboard counters & list
      const itemsRes = await adminGet('/admin/inventory');
      const dashboardRes = await adminGet('/admin/inventory/dashboard');
      setItems(itemsRes?.data || []);
      setDashboard(dashboardRes?.data || dashboardRes || {});
      flashMessage('Stock adjusted successfully!');
    } catch (err) {
      flashMessage(err.message || 'Failed to adjust stock', 'error');
    }
  };

  // ─── ASSIGNMENT FLOW ──────────────────────────────────────────────────────

  const handleOpenAssign = (item) => {
    setAssignTargetItem(item);
    setAssignForm({
      coach_id: coaches[0]?.coach_id || '',
      qty: 1,
      notes: ''
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (assignForm.qty > assignTargetItem.available_qty) {
      flashMessage('Cannot assign more than available stock quantity!', 'error');
      return;
    }
    try {
      await adminPost(`/admin/inventory/${assignTargetItem.item_id}/assign`, {
        coach_id: parseInt(assignForm.coach_id, 10),
        qty: parseInt(assignForm.qty, 10),
        notes: assignForm.notes
      });
      flashMessage('Equipment assigned to coach successfully!');
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to assign equipment', 'error');
    }
  };

  // ─── RETURN FLOW ──────────────────────────────────────────────────────────

  const handleOpenReturn = (assignment) => {
    setReturnTargetAssignment(assignment);
    const maxReturn = assignment.assigned_qty - assignment.returned_qty;
    setReturnForm({
      qty: maxReturn,
      notes: ''
    });
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const maxReturn = returnTargetAssignment.assigned_qty - returnTargetAssignment.returned_qty;
    if (returnForm.qty > maxReturn) {
      flashMessage(`Cannot return more than checked out quantity (${maxReturn})!`, 'error');
      return;
    }
    try {
      await adminPost(`/admin/inventory/assignment/${returnTargetAssignment.assignment_id}/return`, {
        qty: parseInt(returnForm.qty, 10),
        notes: returnForm.notes
      });
      flashMessage('Returned equipment stock updated successfully!');
      setShowReturnModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to return equipment', 'error');
    }
  };

  // ─── COACH REQUEST FLOW ───────────────────────────────────────────────────

  const handleOpenRequestAction = (reqItem) => {
    setSelectedRequest(reqItem);
    setRequestActionForm({
      status: reqItem.status === 'Pending' ? 'Approved' : reqItem.status,
      remarks: reqItem.remarks || ''
    });
    setShowRequestActionModal(true);
  };

  const handleRequestActionSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminPost(`/admin/inventory/requests/${selectedRequest.request_id}/action`, {
        status: requestActionForm.status,
        remarks: requestActionForm.remarks
      });
      flashMessage(`Request marked as: ${requestActionForm.status}`);
      setShowRequestActionModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to update request status', 'error');
    }
  };

  // ─── EXPORT TO CSV FLOW ───────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      flashMessage('No data to export', 'error');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    const headers = Object.keys(reportData[0]).filter(k => typeof reportData[0][k] !== 'object');
    csvContent += headers.join(",") + "\n";

    // Rows
    reportData.forEach((row) => {
      const line = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '';
        // Escape quotes
        val = val.toString().replace(/"/g, '""');
        return `"${val}"`;
      });
      csvContent += line.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${selectedReportType}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering catalog items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model_name && item.model_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSport = !selectedSport || item.sport_id === parseInt(selectedSport, 10);
    const matchesCondition = !selectedCondition || item.condition === selectedCondition;
    const matchesLowStock = !showLowStockOnly || item.available_qty <= item.min_stock_alert;

    return matchesSearch && matchesCategory && matchesSport && matchesCondition && matchesLowStock;
  });

  if (loading) return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inventory & Equipment Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage training assets, oversee coach checkouts, and process replenishment requests.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add Equipment
        </button>
      </div>

      {/* Message System Alerts */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
              message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Items', val: dashboard.totalItems, icon: Package, col: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400' },
          { label: 'Total Stock', val: dashboard.totalStock, icon: Layers, col: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400' },
          { label: 'Checked Out', val: dashboard.assignedStock, valSuffix: ' items', icon: UserCheck, col: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400' },
          { label: 'In Stock', val: dashboard.availableStock, icon: CheckCircle2, col: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' },
          { label: 'Low Stock Alerts', val: dashboard.lowStockAlerts, icon: AlertTriangle, col: dashboard.lowStockAlerts > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50 dark:text-slate-400' },
          { label: 'Damaged Gear', val: dashboard.damagedItems, icon: XCircle, col: dashboard.damagedItems > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50 dark:text-slate-400' }
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -2 }}
            className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm transition-all ${kpi.col}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 opacity-80" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {kpi.val}{kpi.valSuffix || ''}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 overflow-x-auto">
        {[
          { id: 'catalog', label: 'Stock Catalog', count: filteredItems.length },
          { id: 'assignments', label: 'Coach Assignments', count: assignments.length },
          { id: 'requests', label: 'Incoming Requests', count: requests.filter(r => r.status === 'Pending').length, alert: true },
          { id: 'reports', label: 'Reports & Ledger' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tab.alert && tab.count > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Catalog Tab Content */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white"
              >
                <option value="">All Sports</option>
                {sports.map(s => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}
              </select>

              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white"
              >
                <option value="">All Conditions</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Warning Only
              </span>
            </label>
          </div>

          {/* Catalog Roster Grid */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">No Equipment Matches Found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Try clearing filters or add a new equipment item to catalog.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const isLowStock = item.available_qty <= item.min_stock_alert;
                return (
                  <motion.div
                    key={item.item_id}
                    layout
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Container */}
                      <div className="relative h-48 bg-slate-100 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-850">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-16 h-16 text-slate-300 dark:text-slate-700 stroke-1" />
                        )}
                        <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm">
                          {item.category}
                        </span>
                        {isLowStock && (
                          <span className="absolute top-3 right-3 bg-amber-500 text-slate-900 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        )}
                      </div>

                      {/* Info body */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{item.name}</h3>
                          <div className="flex gap-2 items-center mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.brand && <span>{item.brand}</span>}
                            {item.brand && item.model_name && <span>•</span>}
                            {item.model_name && <span>{item.model_name}</span>}
                          </div>
                        </div>

                        {/* Specs tags */}
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          {item.sport?.name && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md">
                              {item.sport.name}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-md ${
                            item.condition === 'New' || item.condition === 'Good'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : item.condition === 'Fair'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-455'
                          }`}>
                            {item.condition} condition
                          </span>
                        </div>

                        {/* Quantity Ledger Block */}
                        <div className="bg-slate-55/60 dark:bg-slate-950 p-3.5 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Total Available</span>
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                              {item.available_qty} <span className="text-xs text-slate-400 font-medium">/ {item.total_qty} total</span>
                            </span>
                          </div>

                          {/* Quick Adjust + / - Panel */}
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                            <button
                              onClick={() => handleAdjustStock(item.item_id, -1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-slate-700 transition"
                              title="Decrease Stock by 1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-700 dark:text-slate-350">Stock</span>
                            <button
                              onClick={() => handleAdjustStock(item.item_id, 1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-555 hover:text-slate-700 transition"
                              title="Increase Stock by 1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900 flex gap-3">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Info
                      </button>
                      <button
                        onClick={() => handleOpenAssign(item)}
                        disabled={item.available_qty === 0}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign Gear
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Coach Assignments</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track what equipment is currently checked out by coaches.</p>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Equipment Checked Out</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Coaches are currently not assigned any equipment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Coach</th>
                    <th className="p-4">Equipment Item</th>
                    <th className="p-4 text-center">Assigned Qty</th>
                    <th className="p-4 text-center">Returned Qty</th>
                    <th className="p-4 text-center">Active Qty</th>
                    <th className="p-4">Assigned Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-350">
                  {assignments.map((asgn) => {
                    const activeQty = asgn.assigned_qty - asgn.returned_qty;
                    return (
                      <tr key={asgn.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{asgn.coach?.name}</td>
                        <td className="p-4">
                          <div className="font-medium text-slate-900 dark:text-white">{asgn.item?.name}</div>
                          <span className="text-xs text-slate-400">{asgn.item?.category}</span>
                        </td>
                        <td className="p-4 text-center font-medium">{asgn.assigned_qty}</td>
                        <td className="p-4 text-center text-slate-400">{asgn.returned_qty}</td>
                        <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-450">{activeQty}</td>
                        <td className="p-4 text-slate-400">{new Date(asgn.assigned_date).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenReturn(asgn)}
                            disabled={activeQty === 0}
                            className="inline-flex items-center gap-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Return Gear
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab Content */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Coach Equipment Requests</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage tickets filed by coaches for equipment repairs, replacements, or stock increments.</p>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Requests Found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Coaches have not submitted any equipment action requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Coach</th>
                    <th className="p-4">Request Type</th>
                    <th className="p-4">Equipment Item</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-750 dark:text-slate-350">
                  {requests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{req.coach?.name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          req.type === 'New'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : req.type === 'Replacement'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : req.type === 'Repair'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                        }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {req.item?.name || req.item_name_new}
                        </div>
                        {req.proof_url && (
                          <a
                            href={req.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                          >
                            <Download className="w-3 h-3" /> View Attachment Proof
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold">{req.quantity}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold ${
                          req.priority === 'High'
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : req.priority === 'Medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-550'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          req.status === 'Pending'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 animate-pulse'
                            : req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : req.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                                : req.status === 'Ordered'
                                  ? 'bg-sky-105 text-sky-800 dark:bg-sky-950 dark:text-sky-400'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenRequestAction(req)}
                          className="inline-flex items-center gap-1 py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-400 text-xs font-bold rounded-lg transition"
                        >
                          <Notebook className="w-3.5 h-3.5" /> Action Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3 items-center">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Select Report Dataset:</label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white font-semibold"
              >
                <option value="current_stock">Current Stock & Quantity Status</option>
                <option value="coach_wise">Coach-wise Assigned Inventory</option>
                <option value="sport_wise">Sport-wise Inventory Catalog</option>
                <option value="damaged">Damaged Equipment Audit</option>
                <option value="request_history">Coach Requests History Log</option>
                <option value="purchase_history">Procurement & Purchase Ledger</option>
                <option value="low_stock">Low Stock & Warnings Report</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition hover:scale-105 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Report (CSV)
            </button>
          </div>

          {/* Report Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {reportLoading ? (
              <div className="p-12 text-center">
                <Loader />
                <span className="text-xs text-slate-500 block mt-2">Loading report details...</span>
              </div>
            ) : reportData.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
                <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Report Data</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">There are no matching entries in this report dataset.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                      {Object.keys(reportData[0])
                        .filter(k => typeof reportData[0][k] !== 'object')
                        .map((key) => (
                          <th key={key} className="p-4 capitalize">{key.replace(/_/g, ' ')}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-350">
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        {Object.keys(row)
                          .filter(k => typeof row[k] !== 'object')
                          .map((key, subIdx) => (
                            <td key={subIdx} className="p-4">
                              {row[key] === null || row[key] === undefined
                                ? ''
                                : typeof row[key] === 'boolean'
                                  ? row[key].toString()
                                  : key.includes('date') || key.includes('at')
                                    ? new Date(row[key]).toLocaleDateString()
                                    : row[key].toString()}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODALS LAYER ────────────────────────────────────────────────────── */}

      {/* Add/Edit Equipment Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingItem ? 'Edit Equipment Details' : 'Add New Equipment'}
              </h2>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Equipment Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    placeholder="e.g. Wilson Tennis Racket"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Sport */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Sport</label>
                  <select
                    value={itemForm.sport_id}
                    onChange={(e) => setItemForm({ ...itemForm, sport_id: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">None / Academy Wide</option>
                    {sports.map(s => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Brand */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Brand</label>
                  <input
                    type="text"
                    value={itemForm.brand}
                    onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. Wilson, Kookaburra"
                  />
                </div>

                {/* Model */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Model Name</label>
                  <input
                    type="text"
                    value={itemForm.model_name}
                    onChange={(e) => setItemForm({ ...itemForm, model_name: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. Pro Staff 97"
                  />
                </div>

                {/* Condition */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Condition *</label>
                  <select
                    value={itemForm.condition}
                    onChange={(e) => setItemForm({ ...itemForm, condition: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Quantities - ONLY editable on creation, or updates both total/available */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Total Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.total_qty}
                    onChange={(e) => setItemForm({ ...itemForm, total_qty: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                {/* Minimum Stock Warning */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Min Stock Warning Level *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.min_stock_alert}
                    onChange={(e) => setItemForm({ ...itemForm, min_stock_alert: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                {/* Purchase Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Purchase Price (Per Item)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.purchase_price}
                    onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                {/* Purchase Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Purchase Date</label>
                  <input
                    type="date"
                    value={itemForm.purchase_date}
                    onChange={(e) => setItemForm({ ...itemForm, purchase_date: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                {/* Supplier */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Supplier</label>
                  <input
                    type="text"
                    value={itemForm.supplier}
                    onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. Sports Emporium Ltd."
                  />
                </div>

                {/* Image Upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Equipment Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-655"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Notes & Comments</label>
                <textarea
                  rows="3"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="Provide any description or specific conditions..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Save Equipment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Assign to Coach Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full shadow-2xl p-6 relative space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Assign Gear: {assignTargetItem?.name}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-sm">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 p-3 rounded-xl">
                Available stock for allocation: <strong className="font-extrabold">{assignTargetItem?.available_qty} items</strong>.
              </div>

              {/* Coach Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Select Coach *</label>
                <select
                  required
                  value={assignForm.coach_id}
                  onChange={(e) => setAssignForm({ ...assignForm, coach_id: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="" disabled>-- Select a Coach --</option>
                  {coaches.map(c => <option key={c.coach_id} value={c.coach_id}>{c.name} ({c.specialization || 'General'})</option>)}
                </select>
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity to Assign *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={assignTargetItem?.available_qty}
                  value={assignForm.qty}
                  onChange={(e) => setAssignForm({ ...assignForm, qty: parseInt(e.target.value, 10) })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Assignment Notes</label>
                <textarea
                  rows="2"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Checked out for Summer Tennis Camp"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Return Equipment Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full shadow-2xl p-6 relative space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Process Return: {returnTargetAssignment?.item?.name}
              </h2>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div>Coach: <strong>{returnTargetAssignment?.coach?.name}</strong></div>
                <div>Assigned: <strong>{returnTargetAssignment?.assigned_qty} items</strong></div>
                <div>Previously Returned: <strong>{returnTargetAssignment?.returned_qty} items</strong></div>
                <div>Currently Outstanding: <strong className="text-indigo-650">{returnTargetAssignment?.assigned_qty - returnTargetAssignment?.returned_qty} items</strong></div>
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity returning *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={returnTargetAssignment?.assigned_qty - returnTargetAssignment?.returned_qty}
                  value={returnForm.qty}
                  onChange={(e) => setReturnForm({ ...returnForm, qty: parseInt(e.target.value, 10) })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Return Details / Condition Notes</label>
                <textarea
                  rows="2"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Returned all in good condition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Action Request Modal */}
      {showRequestActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full shadow-2xl p-6 relative space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Review Request Ticket #{selectedRequest?.request_id}
              </h2>
              <button
                onClick={() => setShowRequestActionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRequestActionSubmit} className="space-y-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div>Coach: <strong>{selectedRequest?.coach?.name}</strong></div>
                <div>Request: <strong>{selectedRequest?.type} Gear</strong></div>
                <div>Item: <strong>{selectedRequest?.item?.name || selectedRequest?.item_name_new}</strong></div>
                <div>Requested Qty: <strong>{selectedRequest?.quantity} items</strong></div>
                <div>Priority: <strong>{selectedRequest?.priority}</strong></div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-slate-500 italic">
                  "{selectedRequest?.reason}"
                </div>
              </div>

              {/* Status Action Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Set Ticket Status *</label>
                <select
                  value={requestActionForm.status}
                  onChange={(e) => setRequestActionForm({ ...requestActionForm, status: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                >
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Ordered">Ordered (Procurement pending)</option>
                  <option value="Delivered">Delivered (Completed)</option>
                </select>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Admin Remarks & Action Logs</label>
                <textarea
                  rows="3"
                  required
                  value={requestActionForm.remarks}
                  onChange={(e) => setRequestActionForm({ ...requestActionForm, remarks: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Approved. Stock allocated from tennis storage."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestActionModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Update Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
