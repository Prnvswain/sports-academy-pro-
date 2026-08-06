import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Edit2,
  UserCheck,
  AlertTriangle,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Clock,
  Notebook,
  FileSpreadsheet,
  Download,
  BarChart2,
  ClipboardList,
  Inbox
} from 'lucide-react';
import Loader from '../../../components/Loader';
import StandardModal from '../../../components/StandardModal';
import { adminGet, adminPost, adminPut, adminPatch } from '../../../api/client';

const CATEGORIES = ['Ball', 'Bat', 'Racket', 'Net', 'Cone', 'Jersey', 'Gloves', 'Mat', 'Stumps', 'Others'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

const getDisplayLabel = (item) => {
  if (!item) return 'Unknown';
  if (item.category === 'Others' && item.name) return item.name;
  return item.category || item.name || 'Unknown';
};

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: BarChart2 },
  { id: 'inventory',    label: 'Inventory',          icon: Package },
  { id: 'assignments',  label: 'Coach Assignments',  icon: UserCheck },
  { id: 'requests',     label: 'Requests',           icon: Inbox },
  { id: 'reports',      label: 'Reports',            icon: FileSpreadsheet },
];

// ─── Flash hook ──────────────────────────────────────────────────────────────
function useFlash() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const flash = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };
  return [message, flash];
}

// ─── Flash Banner ─────────────────────────────────────────────────────────────
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
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium text-sm">{message.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, flash] = useFlash();

  useEffect(() => {
    (async () => {
      try {
        const res = await adminGet('/admin/inventory/dashboard');
        setDashboard(res?.data || res || {});
      } catch (err) {
        flash(err.message || 'Failed to load dashboard', 'error');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Equipment Overview</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live metrics for all equipment stock and coach gear-out.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Items',      val: dashboard.totalItems,     icon: Package,      color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400' },
          { label: 'Total Stock',      val: dashboard.totalStock,     icon: Layers,       color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400' },
          { label: 'Checked Out',      val: dashboard.assignedStock,  icon: UserCheck,    color: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400' },
          { label: 'In Stock',         val: dashboard.availableStock, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' },
          { label: 'Low Stock Alerts', val: dashboard.lowStockAlerts, icon: AlertTriangle, color: dashboard.lowStockAlerts > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/30' },
          { label: 'Damaged Gear',     val: dashboard.damagedItems,   icon: XCircle,      color: dashboard.damagedItems > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/30' },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className={`p-5 rounded-2xl border flex flex-col gap-2 shadow-sm ${kpi.color}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">{kpi.label}</span>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div className="text-3xl font-black tracking-tight">{kpi.val ?? '—'}</div>
          </motion.div>
        ))}
      </div>

      {/* Pending Requests alert */}
      {dashboard.pendingRequests > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">{dashboard.pendingRequests} Pending Equipment Request{dashboard.pendingRequests > 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Switch to the Requests tab to review and action them.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── INVENTORY TAB ────────────────────────────────────────────────────────────
function InventoryTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [sports, setSports] = useState([]);
  const [message, flash] = useFlash();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ category: 'Ball', custom_name: '', sport_id: '', brand_model: '', purchase_date: '', purchase_price: '', supplier: '', total_qty: '', min_stock_alert: '5', condition: 'New', is_consumable: false, notes: '' });
  const [imageFile, setImageFile] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetItem, setAssignTargetItem] = useState(null);
  const [assignForm, setAssignForm] = useState({ coach_id: '', qty: 1, notes: '' });

  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, coachesRes, sportsRes] = await Promise.all([
        adminGet('/admin/inventory'),
        adminGet('/admin/coaches'),
        adminGet('/admin/sports'),
      ]);
      setItems(itemsRes?.data || []);
      setCoaches(coachesRes?.data || coachesRes || []);
      setSports(sportsRes?.data || sportsRes || []);
    } catch (err) { flash(err.message || 'Failed to load equipment', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemForm({ category: 'Ball', custom_name: '', sport_id: '', brand_model: '', purchase_date: new Date().toISOString().split('T')[0], purchase_price: '', supplier: '', total_qty: '10', min_stock_alert: '5', condition: 'New', is_consumable: false, notes: '' });
    setImageFile(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setItemForm({ category: item.category || 'Ball', custom_name: item.category === 'Others' ? item.name : '', sport_id: item.sport_id || '', brand_model: [item.brand, item.model_name].filter(Boolean).join(' '), purchase_date: item.purchase_date ? item.purchase_date.substring(0, 10) : '', purchase_price: item.purchase_price || '', supplier: item.supplier || '', total_qty: item.total_qty || '0', min_stock_alert: item.min_stock_alert || '0', condition: item.condition || 'New', is_consumable: item.is_consumable || false, notes: item.notes || '' });
    setImageFile(null);
    setShowAddEditModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (isSavingItem) return;
    setIsSavingItem(true);
    const brandModel = itemForm.brand_model || '';
    const spaceIdx = brandModel.trim().indexOf(' ');
    const brand = spaceIdx !== -1 ? brandModel.substring(0, spaceIdx).trim() : brandModel;
    const modelName = spaceIdx !== -1 ? brandModel.substring(spaceIdx + 1).trim() : '';
    const payloadName = itemForm.category === 'Others' ? itemForm.custom_name : itemForm.category;
    const formData = new FormData();
    formData.append('name', payloadName);
    formData.append('category', itemForm.category);
    formData.append('brand', brand);
    formData.append('model_name', modelName);
    formData.append('sport_id', itemForm.sport_id || '');
    formData.append('purchase_date', itemForm.purchase_date);
    formData.append('purchase_price', itemForm.purchase_price || '0');
    formData.append('supplier', itemForm.supplier);
    formData.append('total_qty', itemForm.total_qty || '0');
    formData.append('min_stock_alert', itemForm.min_stock_alert || '0');
    formData.append('condition', itemForm.condition);
    formData.append('is_consumable', itemForm.is_consumable);
    formData.append('notes', itemForm.notes);
    if (imageFile) formData.append('image', imageFile);
    try {
      if (editingItem) {
        await adminPut(`/admin/inventory/${editingItem.item_id}`, formData);
        flash('Equipment updated successfully');
      } else {
        await adminPost('/admin/inventory', formData);
        flash('Equipment added successfully');
      }
      setShowAddEditModal(false);
      loadData();
    } catch (err) { flash(err.message || 'Failed to save equipment', 'error'); }
    finally { setIsSavingItem(false); }
  };

  const handleAdjustStock = async (itemId, delta) => {
    try {
      await adminPatch(`/admin/inventory/${itemId}/adjust-stock`, { delta });
      flash('Stock adjusted');
      loadData();
    } catch (err) { flash(err.message || 'Failed to adjust stock', 'error'); }
  };

  const handleOpenAssign = (item) => {
    setAssignTargetItem(item);
    setAssignForm({ coach_id: '', qty: 1, notes: '' });
    setShowAssignModal(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (isAssigning) return;
    setIsAssigning(true);
    try {
      await adminPost('/admin/inventory/assignments', { item_id: assignTargetItem.item_id, coach_id: assignForm.coach_id, qty: assignForm.qty, notes: assignForm.notes });
      flash('Equipment assigned to coach successfully');
      setShowAssignModal(false);
      loadData();
    } catch (err) { flash(err.message || 'Failed to assign equipment', 'error'); }
    finally { setIsAssigning(false); }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || item.model_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSport = !selectedSport || item.sport_id === parseInt(selectedSport);
    const matchesCondition = !selectedCondition || item.condition === selectedCondition;
    const matchesLowStock = !showLowStockOnly || item.available_qty <= item.min_stock_alert;
    return matchesSearch && matchesCategory && matchesSport && matchesCondition && matchesLowStock;
  });

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Equipment Catalog</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage all loose equipment items, stock levels and coach assignments.</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 text-xs transition">
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search name, brand…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selectedSport} onChange={e => setSelectedSport(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Sports</option>
            {sports.map(s => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}
          </select>
          <select value={selectedCondition} onChange={e => setSelectedCondition(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Conditions</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showLowStockOnly} onChange={e => setShowLowStockOnly(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Only</span>
        </label>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Package className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
          <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">No Equipment Found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Try clearing filters or add a new equipment item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const isLowStock = item.available_qty <= item.min_stock_alert;
            return (
              <motion.div key={item.item_id} layout className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="relative h-44 bg-slate-100 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-850">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-16 h-16 text-slate-300 dark:text-slate-700 stroke-1" />}
                    <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm">{getDisplayLabel(item)}</span>
                    {isLowStock && <span className="absolute top-3 right-3 bg-amber-500 text-slate-900 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm"><AlertTriangle className="w-3.5 h-3.5" /> Low Stock</span>}
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{item.brand && item.model_name ? `${item.brand} / ${item.model_name}` : (item.brand || item.model_name || 'Not Specified')}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      {item.sport?.name && <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md">{item.sport.name}</span>}
                      <span className={`px-2 py-1 rounded-md ${item.condition === 'New' || item.condition === 'Good' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : item.condition === 'Fair' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}>{item.condition}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Available</span>
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">{item.available_qty} <span className="text-xs text-slate-400 font-medium">/ {item.total_qty} total</span></span>
                      </div>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                        <button onClick={() => handleAdjustStock(item.item_id, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 transition" title="Decrease Stock"><Minus className="w-4 h-4" /></button>
                        <span className="w-6 text-center text-xs font-bold text-slate-700 dark:text-slate-300">Stk</span>
                        <button onClick={() => handleAdjustStock(item.item_id, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 transition" title="Increase Stock"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900 flex gap-3">
                  <button onClick={() => handleOpenEdit(item)} className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => handleOpenAssign(item)} disabled={item.available_qty === 0} className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"><UserCheck className="w-3.5 h-3.5" /> Assign</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <StandardModal isOpen={showAddEditModal} onClose={() => setShowAddEditModal(false)} title={editingItem ? 'Edit Equipment' : 'Add New Equipment'} size="lg"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowAddEditModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button><button type="submit" disabled={isSavingItem} onClick={handleSaveItem} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">{isSavingItem ? 'Saving…' : editingItem ? 'Update' : 'Add'}</button></div>}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label><select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          {itemForm.category === 'Others' && <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Custom Name</label><input type="text" value={itemForm.custom_name} onChange={e => setItemForm({ ...itemForm, custom_name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>}
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand / Model</label><input type="text" value={itemForm.brand_model} onChange={e => setItemForm({ ...itemForm, brand_model: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport</label><select value={itemForm.sport_id} onChange={e => setItemForm({ ...itemForm, sport_id: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"><option value="">Select Sport</option>{sports.map(s => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Condition</label><select value={itemForm.condition} onChange={e => setItemForm({ ...itemForm, condition: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white">{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Quantity</label><input type="number" value={itemForm.total_qty} onChange={e => setItemForm({ ...itemForm, total_qty: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Stock Alert</label><input type="number" value={itemForm.min_stock_alert} onChange={e => setItemForm({ ...itemForm, min_stock_alert: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label><input type="date" value={itemForm.purchase_date} onChange={e => setItemForm({ ...itemForm, purchase_date: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label><input type="number" value={itemForm.purchase_price} onChange={e => setItemForm({ ...itemForm, purchase_price: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier</label><input type="text" value={itemForm.supplier} onChange={e => setItemForm({ ...itemForm, supplier: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" rows={3} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={itemForm.is_consumable} onChange={e => setItemForm({ ...itemForm, is_consumable: e.target.checked })} className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Consumable Item</span></div>
        </form>
      </StandardModal>

      {/* Assign Modal */}
      <StandardModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Equipment to Coach" subtitle={assignTargetItem?.name} size="md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button><button type="submit" disabled={isAssigning} onClick={handleAssign} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">{isAssigning ? 'Assigning…' : 'Assign'}</button></div>}
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Coach</label><select value={assignForm.coach_id} onChange={e => setAssignForm({ ...assignForm, coach_id: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required><option value="">Select Coach</option>{coaches.map(c => <option key={c.coach_id} value={c.coach_id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity</label><input type="number" min="1" max={assignTargetItem?.available_qty || 1} value={assignForm.qty} onChange={e => setAssignForm({ ...assignForm, qty: parseInt(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required /></div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" rows={2} /></div>
        </form>
      </StandardModal>
    </div>
  );
}

// ─── COACH ASSIGNMENTS TAB ────────────────────────────────────────────────────
function CoachAssignmentsTab() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [message, flash] = useFlash();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnForm, setReturnForm] = useState({ qty: 1, notes: '' });
  const [isReturning, setIsReturning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet('/admin/inventory/assignments');
      setAssignments(res?.data || []);
    } catch (err) { flash(err.message || 'Failed to load assignments', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openReturn = (asgn) => {
    setReturnTarget(asgn);
    setReturnForm({ qty: asgn.assigned_qty - asgn.returned_qty, notes: '' });
    setShowReturnModal(true);
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (isReturning) return;
    setIsReturning(true);
    try {
      await adminPatch(`/admin/inventory/assignments/${returnTarget.assignment_id}/return`, { qty: returnForm.qty, notes: returnForm.notes });
      flash('Equipment returned successfully');
      setShowReturnModal(false);
      loadData();
    } catch (err) { flash(err.message || 'Failed to return', 'error'); }
    finally { setIsReturning(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Coach Equipment Assignments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track all equipment currently checked out by coaches and manage returns.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Equipment Checked Out</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Coaches currently hold no equipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Coach</th><th className="p-4">Equipment</th><th className="p-4 text-center">Assigned</th><th className="p-4 text-center">Returned</th><th className="p-4 text-center">Active</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {assignments.map(asgn => {
                  const activeQty = asgn.assigned_qty - asgn.returned_qty;
                  return (
                    <tr key={asgn.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{asgn.coach?.name || '—'}</td>
                      <td className="p-4"><div className="font-medium text-slate-900 dark:text-white">{asgn.item?.name}</div><span className="text-xs text-slate-400">{getDisplayLabel(asgn.item)}</span></td>
                      <td className="p-4 text-center font-medium">{asgn.assigned_qty}</td>
                      <td className="p-4 text-center text-slate-400">{asgn.returned_qty}</td>
                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{activeQty}</td>
                      <td className="p-4 text-slate-400 text-xs">{new Date(asgn.assigned_date).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => openReturn(asgn)} disabled={activeQty === 0} className="inline-flex items-center gap-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition">
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
      <StandardModal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Return Equipment" subtitle={returnTarget?.item?.name} size="md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowReturnModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button><button type="submit" disabled={isReturning} onClick={handleReturn} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">{isReturning ? 'Returning…' : 'Confirm Return'}</button></div>}
      >
        <form onSubmit={handleReturn} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity to Return</label><input type="number" min="1" max={returnTarget ? returnTarget.assigned_qty - returnTarget.returned_qty : 1} value={returnForm.qty} onChange={e => setReturnForm({ ...returnForm, qty: parseInt(e.target.value) })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required /></div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" rows={2} /></div>
        </form>
      </StandardModal>
    </div>
  );
}

// ─── REQUESTS TAB ─────────────────────────────────────────────────────────────
function RequestsTab() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [message, flash] = useFlash();
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionForm, setActionForm] = useState({ status: 'Approved', remarks: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet('/admin/inventory/requests');
      setRequests(res?.data || []);
    } catch (err) { flash(err.message || 'Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAction = (req) => {
    setSelectedRequest(req);
    setActionForm({ status: 'Approved', remarks: '' });
    setShowActionModal(true);
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await adminPost(`/admin/inventory/requests/${selectedRequest.request_id}/action`, { status: actionForm.status, remarks: actionForm.remarks });
      flash('Request updated successfully');
      setShowActionModal(false);
      loadData();
    } catch (err) { flash(err.message || 'Failed to update', 'error'); }
    finally { setIsUpdating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Incoming Equipment Requests</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage tickets filed by coaches for new equipment, repairs, or replacements.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Requests Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">No equipment requests have been submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Coach</th><th className="p-4">Type</th><th className="p-4">Item</th><th className="p-4 text-center">Qty</th><th className="p-4">Priority</th><th className="p-4">Reason</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {requests.map(req => (
                  <tr key={req.request_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{req.coach?.name}</td>
                    <td className="p-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${req.type === 'New' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : req.type === 'Replacement' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : req.type === 'Repair' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>{req.type}</span></td>
                    <td className="p-4"><div className="font-semibold text-slate-900 dark:text-white">{req.item?.name || req.item_name_new}</div>{req.proof_url && <a href={req.proof_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5 mt-0.5"><Download className="w-3 h-3" /> View Proof</a>}</td>
                    <td className="p-4 text-center font-bold">{req.quantity}</td>
                    <td className="p-4"><span className={`text-xs font-semibold ${req.priority === 'High' ? 'text-rose-600 font-bold' : req.priority === 'Medium' ? 'text-amber-600' : 'text-slate-400'}`}>{req.priority}</span></td>
                    <td className="p-4 max-w-xs truncate text-xs" title={req.reason}>{req.reason}</td>
                    <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${req.status === 'Pending' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 animate-pulse' : req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400'}`}>{req.status}</span></td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleOpenAction(req)} className="inline-flex items-center gap-1 py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-400 text-xs font-bold rounded-lg transition">
                        <Notebook className="w-3.5 h-3.5" /> Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <StandardModal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Action Equipment Request" subtitle={selectedRequest?.item?.name || selectedRequest?.item_name_new} size="md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowActionModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button><button type="submit" disabled={isUpdating} onClick={handleAction} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">{isUpdating ? 'Updating…' : 'Update Request'}</button></div>}
      >
        <form onSubmit={handleAction} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label><select value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Ordered">Ordered</option><option value="Delivered">Delivered</option></select></div>
          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks</label><textarea value={actionForm.remarks} onChange={e => setActionForm({ ...actionForm, remarks: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" rows={3} /></div>
        </form>
      </StandardModal>
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [selectedType, setSelectedType] = useState('current_stock');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, flash] = useFlash();

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGet(`/admin/inventory/reports?type=${selectedType}`);
      setReportData(res?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch report');
      flash(err.message || 'Failed to fetch report', 'error');
    } finally { setLoading(false); }
  }, [selectedType]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleExport = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `equipment_report_${selectedType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const cols = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Equipment Reports & Ledger</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Generate and export inventory data reports.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Type:</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-900 dark:text-white font-semibold">
            <option value="current_stock">Current Stock & Quantity Status</option>
            <option value="coach_wise">Coach-wise Assigned Inventory</option>
            <option value="sport_wise">Sport-wise Inventory Catalog</option>
            <option value="damaged">Damaged Equipment Audit</option>
            <option value="request_history">Coach Requests History Log</option>
            <option value="purchase_history">Procurement & Purchase Ledger</option>
            <option value="low_stock">Low Stock & Warnings Report</option>
          </select>
        </div>
        <button onClick={handleExport} disabled={reportData.length === 0} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition hover:scale-105 active:scale-95">
          <FileSpreadsheet className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading report…</p></div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">Failed to Load Report</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
            <button onClick={loadReport} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition"><RotateCcw className="w-4 h-4" /> Retry</button>
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Report Data</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Try a different report type or check back later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">{cols.map((col, i) => <th key={i} className="p-4">{col.replace(/_/g, ' ')}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {reportData.map((row, i) => <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">{cols.map((col, j) => <td key={j} className="p-4">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function InventoryStock() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5"
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Inventory</span>
            <span className="opacity-40">/</span>
            <span className="font-semibold text-foreground">Equipment</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Equipment</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            Coach gear, stock levels, requests and reports
          </p>
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
          {activeTab === 'dashboard'   && <DashboardTab />}
          {activeTab === 'inventory'   && <InventoryTab />}
          {activeTab === 'assignments' && <CoachAssignmentsTab />}
          {activeTab === 'requests'    && <RequestsTab />}
          {activeTab === 'reports'     && <ReportsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
