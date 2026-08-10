import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  DollarSign,
  Package,
  Layers,
  UserCheck,
  Trophy,
  Activity,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  BarChart2,
  CreditCard,
  Users,
  ChevronDown,
  ChevronRight,
  Receipt,
  Eye,
  RotateCcw,
  Filter,
  Printer,
  ShieldCheck,
  GraduationCap,
  Ban,
  Pencil
} from 'lucide-react';
import StandardModal from '../../../components/StandardModal';
import { adminGet, adminPost, adminPut, adminDelete, adminPatch } from '../../../api/client';

const CATEGORIES = ['Ball', 'Bat', 'Racket', 'Net', 'Cone', 'Jersey', 'Gloves', 'Mat', 'Stumps', 'Others'];

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: BarChart2 },
  { id: 'kits',        label: 'Kits',         icon: Package },
  { id: 'assignments', label: 'Assignments',  icon: Users },
  { id: 'payments',    label: 'Payments',     icon: CreditCard },
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, flash] = useFlash();

  useEffect(() => {
    (async () => {
      try {
        const [kitsRes, assignRes] = await Promise.all([
          adminGet('/admin/inventory/kits'),
          adminGet('/admin/inventory/kits/assignments'),
        ]);
        const kits = kitsRes.data || [];
        const assignments = assignRes.data || [];
        const totalKits = kits.length;
        const availableSets = kits.reduce((s, k) => s + (k.available_qty || 0), 0);
        const assignedSets = kits.reduce((s, k) => s + (k.assigned_qty || 0), 0);
        const pendingPayments = assignments.filter(a => a.payment_status === 'UNPAID').length;
        const lowStock = kits.filter(k => (k.available_qty || 0) === 0).length;
        const recent = [...assignments]
          .sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
          .slice(0, 6);
        setData({ totalKits, availableSets, assignedSets, pendingPayments, lowStock, recent });
      } catch (err) { flash(err.message || 'Failed to load dashboard', 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div>
        <h2 className="text-xl font-extrabold text-foreground">Sports Kits Overview</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live kit metrics across all sports.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total Kits',       val: data?.totalKits,       icon: Package,       color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400' },
          { label: 'Available Sets',   val: data?.availableSets,   icon: Layers,        color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' },
          { label: 'Assigned Sets',    val: data?.assignedSets,    icon: UserCheck,     color: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400' },
          { label: 'Pending Payments', val: data?.pendingPayments, icon: DollarSign,    color: data?.pendingPayments > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/30' },
          { label: 'Out of Stock',     val: data?.lowStock,        icon: AlertTriangle, color: data?.lowStock > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/30' },
        ].map((kpi, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }} className={`p-5 rounded-2xl border flex flex-col gap-2 shadow-sm ${kpi.color}`}>
            <div className="flex justify-between items-center"><span className="text-xs font-bold uppercase tracking-wider opacity-70">{kpi.label}</span><kpi.icon className="w-4 h-4" /></div>
            <div className="text-3xl font-black tracking-tight">{kpi.val ?? '—'}</div>
          </motion.div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Recent Assignments</h3>
          <span className="text-xs text-muted-foreground">Last 6</span>
        </div>
        {data?.recent?.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-xs">No assignments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800"><th className="p-4">Student</th><th className="p-4">Kit</th><th className="p-4">Issue Date</th><th className="p-4">Payment</th><th className="p-4">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.recent?.map(item => (
                  <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                    <td className="p-4 font-semibold">{item.student?.name || '—'}</td>
                    <td className="p-4">{item.kit?.name || '—'}</td>
                    <td className="p-4">{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '—'}</td>
                    <td className="p-4"><span className={`px-2 py-0.5 rounded-full font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>{item.payment_status}</span></td>
                    <td className="p-4"><span className={`px-2 py-0.5 rounded-full font-bold ${item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{item.status}</span></td>
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

// ─── KITS TAB ─────────────────────────────────────────────────────────────────
function KitsTab({ onAssignKit, refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [kits, setKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [message, flash] = useFlash();
  const [submitting, setSubmitting] = useState(false);

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);

  const [kitForm, setKitForm] = useState({ name: '', description: '', status: 'ACTIVE', total_qty: 0, selling_price: 0, items: [] });
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Others');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [sportSearch, setSportSearch] = useState('');
  const [kitSearch, setKitSearch] = useState('');
  const [isSellingPriceEdited, setIsSellingPriceEdited] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState(null);

  const handleCategoryChange = (cat) => {
    setNewItemCategory(cat);
    if (cat !== 'Others') {
      setNewItemName(cat);
    } else {
      setNewItemName('');
    }
  };

  const handleEditItem = (item, idx) => {
    setEditingItemIdx(idx);
    setNewItemName(item.name);
    setNewItemCategory(item.category || 'Others');
    setNewItemQty(item.qty);
    setNewItemPrice(item.price);
  };

  const cancelEditItem = () => {
    setEditingItemIdx(null);
    setNewItemName('');
    setNewItemCategory('Others');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const loadSports = useCallback(async () => {
    try { const res = await adminGet('/admin/inventory/kits/sports'); setSports(res.data || []); } catch { setSports([]); }
  }, []);

  useEffect(() => { Promise.all([loadSports()]).then(() => setLoading(false)); }, [loadSports]);

  useEffect(() => {
    refreshKits();
  }, [refreshKey]);

  const selectSport = async sport => {
    setSelectedSport(sport); setSelectedKit(null);
    try { const res = await adminGet(`/admin/inventory/kits?sport_id=${sport.sport_id}`); setKits(res.data || []); } catch { flash('Failed to load kits', 'error'); }
  };

  const refreshKits = async () => {
    if (!selectedSport) return;
    try { const res = await adminGet(`/admin/inventory/kits?sport_id=${selectedSport.sport_id}`); setKits(res.data || []); } catch {}
  };

  const loadKitAssignments = async kit => {
    setSelectedKit(kit);
    try { const res = await adminGet(`/admin/inventory/kits/assignments?kit_id=${kit.kit_id}`); setAssignments(res.data || []); } catch { flash('Failed to load assignments', 'error'); }
  };

  const openAddKit = () => {
    if (!selectedSport) {
      flash('Please select a sport first before creating a kit', 'error');
      return;
    }
    setEditingKit(null);
    setKitForm({ name: '', description: '', status: 'ACTIVE', total_qty: 0, selling_price: 0, items: [] });
    setNewItemName(''); setNewItemCategory('Others'); setNewItemQty(1); setNewItemPrice(0);
    setIsSellingPriceEdited(false);
    setEditingItemIdx(null);
    setShowAddEditModal(true);
  };

  const openEditKit = kit => {
    setEditingKit(kit);
    setKitForm({ name: kit.name, description: kit.description || '', status: kit.status || 'ACTIVE', total_qty: kit.total_qty, selling_price: Number(kit.selling_price), items: JSON.parse(kit.items || '[]') });
    setNewItemName(''); setNewItemCategory('Others'); setNewItemQty(1); setNewItemPrice(0);
    setIsSellingPriceEdited(true);
    setEditingItemIdx(null);
    setShowAddEditModal(true);
  };

  const addItemToKitForm = () => {
    if (!newItemName.trim()) { flash('Item name is required', 'error'); return; }
    const qtyVal = parseInt(newItemQty, 10);
    const priceVal = parseFloat(newItemPrice);
    if (isNaN(qtyVal) || qtyVal <= 0) { flash('Quantity must be > 0', 'error'); return; }
    
    let updatedItems;
    if (editingItemIdx !== null) {
      updatedItems = kitForm.items.map((item, i) => i === editingItemIdx ? { name: newItemName.trim(), category: newItemCategory, qty: qtyVal, price: isNaN(priceVal) ? 0 : priceVal } : item);
      setEditingItemIdx(null);
    } else {
      updatedItems = [...kitForm.items, { name: newItemName.trim(), category: newItemCategory, qty: qtyVal, price: isNaN(priceVal) ? 0 : priceVal }];
    }
    
    const newBase = updatedItems.reduce((acc, item) => acc + item.qty * item.price, 0);
    setKitForm({ ...kitForm, items: updatedItems, selling_price: isSellingPriceEdited ? kitForm.selling_price : newBase });
    setNewItemName(''); setNewItemCategory('Others'); setNewItemQty(1); setNewItemPrice(0);
  };

  const removeItemFromKitForm = idx => {
    const updatedItems = kitForm.items.filter((_, i) => i !== idx);
    const newBase = updatedItems.reduce((acc, item) => acc + item.qty * item.price, 0);
    setKitForm({ ...kitForm, items: updatedItems, selling_price: isSellingPriceEdited ? kitForm.selling_price : newBase });
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setNewItemName(''); setNewItemCategory('Others'); setNewItemQty(1); setNewItemPrice(0);
    } else if (editingItemIdx !== null && editingItemIdx > idx) {
      setEditingItemIdx(editingItemIdx - 1);
    }
  };

  const submitKitForm = async e => {
    e.preventDefault();
    if (!kitForm.name.trim()) { flash('Kit name is required', 'error'); return; }
    if (kitForm.items.length === 0) { flash('Add at least one item', 'error'); return; }
    if (!selectedSport || !selectedSport.sport_id) { flash('Sport selection is required', 'error'); return; }
    setSubmitting(true);
    try {
      const payload = { ...kitForm, sport_id: selectedSport.sport_id, items: JSON.stringify(kitForm.items) };
      if (editingKit) { await adminPut(`/admin/inventory/kits/${editingKit.kit_id}`, payload); flash('Kit updated!'); }
      else { await adminPost('/admin/inventory/kits', payload); flash('Kit created!'); }
      setShowAddEditModal(false); refreshKits();
    } catch (err) { flash(err.message || 'Operation failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteKit = async kit => {
    if (kit.assigned_qty > 0) { flash('Cannot delete kit with active assignments!', 'error'); return; }
    if (!window.confirm(`Delete "${kit.name}"?`)) return;
    try { await adminDelete(`/admin/inventory/kits/${kit.kit_id}`); flash('Kit deleted'); refreshKits(); }
    catch (err) { flash(err.message || 'Failed to delete', 'error'); }
  };



  const handleReturnKit = async item => {
    if (!window.confirm(`Mark kit returned for "${item.student?.name}"?`)) return;
    try {
      await adminPatch(`/admin/inventory/kits/assignments/${item.assignment_id}/return`, {});
      flash('Kit returned!');
      if (selectedKit) loadKitAssignments(selectedKit); refreshKits();
    } catch (err) { flash(err.message || 'Failed to return', 'error'); }
  };

  const handleMarkPaid = async item => {
    if (!window.confirm(`Mark payment as PAID for "${item.student?.name}"?`)) return;
    try {
      await adminPatch(`/admin/inventory/kits/assignments/${item.assignment_id}/payment`, { payment_method: 'cash' });
      flash('Payment marked as paid!');
      if (selectedKit) loadKitAssignments(selectedKit);
    } catch (err) { flash(err.message || 'Failed to update payment', 'error'); }
  };

  const filteredSports = sports.filter(s => s.name.toLowerCase().includes(sportSearch.toLowerCase()));
  const filteredKits = kits.filter(k => k.name.toLowerCase().includes(kitSearch.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />

      {/* SPORT SELECTION */}
      {!selectedSport && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div><h2 className="text-xl font-extrabold text-foreground">Select a Sport</h2><p className="text-xs text-muted-foreground mt-0.5">Click a sport to manage its kits.</p></div>
            <div className="relative w-64"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Search sport…" value={sportSearch} onChange={e => setSportSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          </div>
          {filteredSports.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"><Trophy className="w-12 h-12 text-slate-400 mx-auto stroke-1" /><h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">No sports found</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Register sports in the Sports Catalog first.</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSports.map(sport => (
                <motion.div key={sport.sport_id} whileHover={{ scale: 1.03, y: -2 }} onClick={() => selectSport(sport)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 shadow-inner">{sport.icon || '🏅'}</div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{sport.name}</h4>
                  <div className="grid grid-cols-3 gap-1 mt-3 w-full border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[9px] text-center">
                    <div><div className="text-slate-400 font-bold uppercase">Kits</div><div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.totalKits || 0}</div></div>
                    <div><div className="text-slate-400 font-bold uppercase">Avail</div><div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.availableStock || 0}</div></div>
                    <div><div className="text-slate-400 font-bold uppercase">Used</div><div className="font-extrabold text-slate-800 dark:text-white mt-0.5">{sport.assignedStock || 0}</div></div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KIT LIST */}
      {selectedSport && !selectedKit && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedSport(null)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"><ArrowLeft className="w-4 h-4" /></button>
            <div><h2 className="text-xl font-extrabold text-foreground">{selectedSport.name} — Kits</h2><p className="text-xs text-muted-foreground">Build and manage kits for this sport.</p></div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-64"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Search kits…" value={kitSearch} onChange={e => setKitSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            <button type="button" onClick={openAddKit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-sm transition"><Plus className="w-4 h-4" /> Build New Kit</button>
          </div>
          {filteredKits.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <Package className="w-12 h-12 text-slate-400 stroke-1" /><h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">No kits yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Build the first kit for {selectedSport.name}.</p>
              <button onClick={openAddKit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 text-xs shadow-sm transition"><Plus className="w-4 h-4" /> Create First Kit</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredKits.map(kit => {
                const isOutOfStock = kit.available_qty === 0;
                return (
                  <div key={kit.kit_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div><h3 className="font-extrabold text-base text-slate-900 dark:text-white">{kit.name}</h3><span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${kit.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{kit.status}</span></div>
                        <div className="text-right"><span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">₹{Number(kit.selling_price)}</span><div className="text-[10px] text-muted-foreground font-semibold">Base: ₹{JSON.parse(kit.items || '[]').reduce((acc, i) => acc + i.qty * i.price, 0)}</div></div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{kit.description || 'No description'}</p>
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
                        <div><div className="text-[10px] text-muted-foreground font-semibold">Total</div><div className="text-sm font-bold mt-0.5">{kit.total_qty}</div></div>
                        <div><div className="text-[10px] text-muted-foreground font-semibold">Available</div><div className={`text-sm font-bold mt-0.5 ${isOutOfStock ? 'text-rose-500 animate-pulse' : ''}`}>{kit.available_qty}</div></div>
                        <div><div className="text-[10px] text-muted-foreground font-semibold">Assigned</div><div className="text-sm font-bold mt-0.5">{kit.assigned_qty}</div></div>
                      </div>
                    </div>
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                      <button type="button" onClick={() => loadKitAssignments(kit)} className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline">View Members</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditKit(kit)} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteKit(kit)} className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition" title="Delete"><Trash className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => onAssignKit(kit)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition">Assign</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KIT MEMBERS VIEW */}
      {selectedSport && selectedKit && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedKit(null)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"><ArrowLeft className="w-4 h-4" /></button>
            <div><h2 className="text-xl font-extrabold text-foreground">{selectedKit.name}</h2><p className="text-xs text-muted-foreground">Assigned students for this kit.</p></div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800"><h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Assigned Students</h3></div>
            {assignments.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-xs italic">This kit has not been assigned to any student yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase"><th className="p-4">Student</th><th className="p-4">Batch</th><th className="p-4">Issue Date</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assignments.map(item => (
                      <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                        <td className="p-4 font-semibold flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold shrink-0">{item.student?.name?.charAt(0) || 'S'}</div>{item.student?.name}</td>
                        <td className="p-4">{item.student?.batch?.name || 'N/A'}</td>
                        <td className="p-4">{new Date(item.issue_date).toLocaleDateString()}</td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'}`}>{item.payment_status}</span></td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full font-bold ${item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{item.status}</span></td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {item.payment_status === 'UNPAID' && <button type="button" onClick={() => handleMarkPaid(item)} className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 transition">Mark Paid</button>}
                          {item.status === 'ACTIVE' && <button type="button" onClick={() => handleReturnKit(item)} className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition">Return</button>}
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

      {/* Add/Edit Kit Modal */}
      <StandardModal isOpen={showAddEditModal} onClose={() => setShowAddEditModal(false)} title={editingKit ? 'Edit Kit' : 'Build New Kit'} subtitle={selectedSport?.name} size="xl"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowAddEditModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button><button onClick={submitKitForm} disabled={submitting} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">{submitting ? 'Saving…' : editingKit ? 'Update Kit' : 'Create Kit'}</button></div>}
      >
        <form onSubmit={submitKitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Kit Name *</label><input type="text" value={kitForm.name} onChange={e => setKitForm({ ...kitForm, name: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required /></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label><select value={kitForm.status} onChange={e => setKitForm({ ...kitForm, status: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Sets</label><input type="number" min="0" value={kitForm.total_qty} onChange={e => setKitForm({ ...kitForm, total_qty: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Kit Contents</span>
              <span className="text-xs text-emerald-600 font-bold">Base Cost: ₹{kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0).toFixed(2)}</span>
            </div>
            <div className="p-4 space-y-3">
              <div className={`grid gap-2 items-end ${newItemCategory === 'Others' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                {newItemCategory === 'Others' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Item Name / Custom Name</label>
                    <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Bat" className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required={newItemCategory === 'Others'} />
                  </div>
                )}
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label><select value={newItemCategory} onChange={e => handleCategoryChange(e.target.value)} className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Qty</label><input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1"><label className="block text-xs font-semibold text-muted-foreground mb-1">Unit Price (₹)</label><input type="number" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
                <div className="flex gap-2">
                  <button type="button" onClick={addItemToKitForm} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                    {editingItemIdx !== null ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {editingItemIdx !== null ? 'Update' : 'Add'}
                  </button>
                  {editingItemIdx !== null && (
                    <button type="button" onClick={cancelEditItem} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-lg transition">Cancel</button>
                  )}
                </div>
              </div>
              {kitForm.items.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {kitForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.name} <span className="text-muted-foreground font-normal">({item.category || 'Others'}) × {item.qty}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-600 font-bold">₹{item.qty * item.price}</span>
                        <button type="button" onClick={() => handleEditItem(item, idx)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white" title="Edit Item"><Edit className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => removeItemFromKitForm(idx)} className="text-rose-500 hover:text-rose-700" title="Remove Item"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label><textarea value={kitForm.description} onChange={e => setKitForm({ ...kitForm, description: e.target.value })} rows={2} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Selling Price (₹) *</label>
              <input type="number" min="0" value={kitForm.selling_price} onChange={e => { setKitForm({ ...kitForm, selling_price: parseFloat(e.target.value) || 0 }); setIsSellingPriceEdited(true); }} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required />
              
              {kitForm.selling_price < kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0) && (
                <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠ Warning:</span> You are selling this kit below cost. Estimated Loss: <span className="font-extrabold text-rose-600 dark:text-rose-450">₹{(kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0) - kitForm.selling_price).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-850 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Base Cost:</span>
                <span className="font-semibold text-slate-800 dark:text-white">₹{kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Selling Price:</span>
                <span className="font-semibold text-slate-800 dark:text-white">₹{Number(kitForm.selling_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 font-bold">
                <span className="text-slate-600 dark:text-slate-300">Profit / Loss:</span>
                <span className={kitForm.selling_price >= kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                  {kitForm.selling_price >= kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0) 
                    ? `+₹${(kitForm.selling_price - kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0)).toFixed(2)}` 
                    : `-₹${(kitForm.items.reduce((acc, i) => acc + i.qty * i.price, 0) - kitForm.selling_price).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}

// ─── COACH ASSIGNMENTS SECTION ────────────────────────────────────────────────
function CoachAssignmentsSection({ onAssignCoach, refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [kits, setKits] = useState([]);
  const [message, flash] = useFlash();

  // Filters
  const [filterCoach, setFilterCoach] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, coachRes, kitsRes] = await Promise.all([
        adminGet('/admin/inventory/kits/coach-assignments'),
        adminGet('/admin/coaches'),
        adminGet('/admin/inventory/kits'),
      ]);
      setAssignments(assignRes.data || []);
      setCoaches(coachRes.data?.coaches || coachRes.data || []);
      setKits((kitsRes.data || []).filter(k => k.status === 'ACTIVE'));
    } catch (err) { flash(err.message || 'Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);



  const handleRevoke = async (assignment) => {
    if (!window.confirm(`Revoke kit assignment for coach "${assignment.coach?.name}"? Remaining stock will be restored.`)) return;
    try {
      await adminDelete(`/admin/inventory/kits/coach-assignments/${assignment.id}`);
      flash('Assignment revoked. Stock restored.');
      loadData();
    } catch (err) { flash(err.message || 'Failed to revoke', 'error'); }
  };

  const filtered = assignments.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterCoach && !a.coach?.name?.toLowerCase().includes(filterCoach.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <FlashBanner message={message} />

      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-extrabold text-foreground">Coach Assignments</h3>
          </div>
          <p className="text-xs text-muted-foreground">Assign sport kits (with quantity) to coaches. Coaches can then issue these to students.</p>
        </div>
        <button
          type="button"
          onClick={() => onAssignCoach(null)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Assign Kit to Coach
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search coach name…" value={filterCoach} onChange={e => setFilterCoach(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto stroke-1" />
            <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-white">No Coach Assignments</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Assign kits to coaches so they can distribute to students.</p>
            <button onClick={openAddModal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition">Assign Kit to Coach</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Coach</th>
                  <th className="p-4">Kit</th>
                  <th className="p-4">Sport</th>
                  <th className="p-4">Assigned Qty</th>
                  <th className="p-4">Remaining</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-extrabold shrink-0 text-xs">
                          {a.coach?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{a.coach?.name || '—'}</div>
                          {a.coach?.specialization && <div className="text-[10px] text-slate-400">{a.coach.specialization}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-white">{a.kit?.name || '—'}</td>
                    <td className="p-4 text-slate-500">{a.kit?.sport?.name || '—'}</td>
                    <td className="p-4">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{a.quantity}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-bold text-sm ${a.remaining_qty === 0 ? 'text-rose-500' : a.remaining_qty < a.quantity ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {a.remaining_qty}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{a.assignment_date ? new Date(a.assignment_date).toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        a.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 max-w-[140px] truncate text-slate-400 italic" title={a.notes || ''}>{a.notes || '—'}</td>
                    <td className="p-4 text-right">
                      {a.status === 'ACTIVE' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAssignCoach(null, a)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition"
                            title="Edit assignment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(a)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                            title="Revoke assignment"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {a.status === 'REVOKED' && (
                        <span className="text-[10px] text-slate-400 italic">Revoked</span>
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
  );
}

// ─── STUDENT ASSIGNMENTS SECTION ──────────────────────────────────────────────
function StudentAssignmentsSection({ onAssignStudent, refreshKey }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState([]);
  const [sports, setSports] = useState([]);
  const [batches, setBatches] = useState([]);
  const [kits, setKits] = useState([]);
  const [students, setStudents] = useState([]);
  const [message, flash] = useFlash();
  const [expandedStudents, setExpandedStudents] = useState({});

  // Receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptItem, setReceiptItem] = useState(null);

  // Filters
  const [filterStudent, setFilterStudent] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterKit, setFilterKit] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, sportsRes, kitsRes, studentsRes] = await Promise.all([
        adminGet('/admin/inventory/kits/assignments'),
        adminGet('/admin/sports'),
        adminGet('/admin/inventory/kits'),
        adminGet('/admin/students'),
      ]);
      const assignments = assignRes.data || [];
      setAllAssignments(assignments);
      setSports(sportsRes?.data || sportsRes || []);
      setKits([...new Map(assignments.map(a => [a.kit?.kit_id, a.kit])).values()].filter(Boolean));
      setStudents(studentsRes.data?.students || studentsRes.data || []);
      const batchMap = {};
      assignments.forEach(a => { if (a.student?.batch) batchMap[a.student.batch.batch_id] = a.student.batch; });
      setBatches(Object.values(batchMap));
    } catch (err) { flash(err.message || 'Failed to load assignments', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const toggleStudent = (studentId) => {
    setExpandedStudents(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const filtered = allAssignments.filter(a => {
    if (filterStudent && !a.student?.name?.toLowerCase().includes(filterStudent.toLowerCase()) && !a.student?.student_id?.toString().includes(filterStudent)) return false;
    if (filterSport && a.kit?.sport?.name !== filterSport) return false;
    if (filterBatch && a.student?.batch?.name !== filterBatch) return false;
    if (filterKit && a.kit?.name !== filterKit) return false;
    if (filterPayment && a.payment_status !== filterPayment) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const grouped = {};
  filtered.forEach(a => {
    const sid = a.student?.student_id || 'unknown';
    if (!grouped[sid]) grouped[sid] = { student: a.student, assignments: [] };
    grouped[sid].assignments.push(a);
  });
  const groupedList = Object.values(grouped);

  const handleMarkPaid = async (item) => {
    if (!window.confirm(`Mark payment PAID for ${item.student?.name}?`)) return;
    try {
      await adminPatch(`/admin/inventory/kits/assignments/${item.assignment_id}/payment`, { payment_method: 'cash' });
      flash('Payment marked as paid!');
      loadData();
    } catch (err) { flash(err.message || 'Failed', 'error'); }
  };

  const handleMarkReturned = async (item) => {
    if (!window.confirm(`Mark kit returned for ${item.student?.name}?`)) return;
    try {
      await adminPatch(`/admin/inventory/kits/assignments/${item.assignment_id}/return`, {});
      flash('Kit marked as returned!');
      loadData();
    } catch (err) { flash(err.message || 'Failed', 'error'); }
  };



  const openReceipt = (item) => { setReceiptItem(item); setShowReceiptModal(true); };
  const handlePrintReceipt = () => { window.print(); };
  const clearFilters = () => { setFilterStudent(''); setFilterSport(''); setFilterBatch(''); setFilterKit(''); setFilterPayment(''); setFilterStatus(''); };
  const hasFilters = filterStudent || filterSport || filterBatch || filterKit || filterPayment || filterStatus;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <FlashBanner message={message} />
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-extrabold text-foreground">Student Assignments</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>All kit assignments grouped by student — with history, actions and receipt generation.</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-500">{groupedList.length} students · {filtered.length} assignments</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAssignStudent(null, null)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Assign Kit to Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"><Filter className="w-3.5 h-3.5" /> Filters</div>
          {hasFilters && <button onClick={clearFilters} className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Clear all</button>}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search student name or ID…" value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" />
          </div>
          <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Sports</option>
            {sports.map(s => <option key={s.sport_id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.batch_id} value={b.name}>{b.name}</option>)}
          </select>
          <select value={filterKit} onChange={e => setFilterKit(e.target.value)} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white">
            <option value="">All Kits</option>
            {kits.map(k => <option key={k?.kit_id} value={k?.name}>{k?.name}</option>)}
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

      {/* Student Cards */}
      {groupedList.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{hasFilters ? 'No Matches Found' : 'No Kit Assignments Yet'}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{hasFilters ? 'Try adjusting or clearing filters.' : 'Assign a kit to a student from the Kits tab.'}</p>
          {hasFilters && <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700">Clear Filters</button>}
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
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition" onClick={() => toggleStudent(sid)}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-sm">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{student?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground font-mono">#{student?.student_id}</span>
                      {student?.batch?.name && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{student.batch.name}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">{studentAssignments.length} kit assignment{studentAssignments.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeCount > 0 && <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">{activeCount} Active</span>}
                    {unpaidCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-955/30 dark:text-amber-400 animate-pulse">{unpaidCount} Unpaid</span>}
                    <button type="button" onClick={e => { e.stopPropagation(); onAssignStudent(null, student); }} className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition"><Plus className="w-3 h-3" /> Assign Kit</button>
                    <button type="button" onClick={e => { e.stopPropagation(); navigate('/admin/students'); }} className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition" title="View Student Profile"><Eye className="w-3 h-3" /> Profile</button>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
                      <div className="flex sm:hidden gap-2 p-4 pb-0">
                        <button type="button" onClick={() => onAssignStudent(null, student)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> Assign Kit</button>
                        <button type="button" onClick={() => navigate('/admin/students')} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"><Eye className="w-3.5 h-3.5" /> Profile</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                              <th className="px-5 py-3">Kit</th><th className="px-5 py-3">Sport</th><th className="px-5 py-3">Issued</th><th className="px-5 py-3">Return Date</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Remarks</th><th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {studentAssignments.map(item => (
                              <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{item.kit?.name || '—'}</td>
                                <td className="px-5 py-3 text-slate-500">{item.kit?.sport?.name || '—'}</td>
                                <td className="px-5 py-3">{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '—'}</td>
                                <td className="px-5 py-3">{item.return_date ? new Date(item.return_date).toLocaleDateString() : item.expected_return_date ? <span className="text-amber-500">{new Date(item.expected_return_date).toLocaleDateString()} (exp.)</span> : '—'}</td>
                                <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">₹{Number(item.kit?.selling_price || 0)}</td>
                                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'}`}>{item.payment_status}</span></td>
                                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full font-bold ${item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{item.status}</span></td>
                                <td className="px-5 py-3 max-w-[140px] truncate" title={item.remarks || ''}>{item.remarks || <span className="text-slate-400 italic">—</span>}</td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {item.payment_status === 'UNPAID' && <button onClick={() => handleMarkPaid(item)} className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg transition">Mark Paid</button>}
                                    {item.status === 'ACTIVE' && <button onClick={() => handleMarkReturned(item)} className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-0.5"><RotateCcw className="w-2.5 h-2.5" /> Return</button>}
                                    {item.payment_status === 'PAID' && <button onClick={() => openReceipt(item)} className="px-2 py-1 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition flex items-center gap-0.5"><Receipt className="w-2.5 h-2.5" /> Receipt</button>}
                                    {item.status !== 'ACTIVE' && <span className="text-[10px] text-slate-400 italic px-1">Returned</span>}
                                  </div>
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



      {/* Receipt Modal */}
      <StandardModal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Kit Assignment Receipt" subtitle={receiptItem?.student?.name} size="md"
        footer={<div className="flex gap-3"><button type="button" onClick={() => setShowReceiptModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Close</button><button onClick={handlePrintReceipt} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print Receipt</button></div>}
      >
        {receiptItem && (
          <div className="space-y-4 print:text-black">
            <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="text-2xl font-black text-emerald-600">Sports Academy Pro</div>
              <div className="text-xs text-muted-foreground mt-1">Kit Assignment Receipt</div>
              <div className="text-xs text-muted-foreground">Receipt #{receiptItem.assignment_id} · {new Date().toLocaleDateString()}</div>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ['Student', receiptItem.student?.name],
                ['Student ID', `#${receiptItem.student?.student_id}`],
                ['Batch', receiptItem.student?.batch?.name || '—'],
                ['Kit Name', receiptItem.kit?.name],
                ['Sport', receiptItem.kit?.sport?.name || '—'],
                ['Issue Date', new Date(receiptItem.issue_date).toLocaleDateString()],
                ['Return Date', receiptItem.return_date ? new Date(receiptItem.return_date).toLocaleDateString() : receiptItem.expected_return_date ? `${new Date(receiptItem.expected_return_date).toLocaleDateString()} (expected)` : '—'],
                ['Amount', `₹${Number(receiptItem.kit?.selling_price || 0)}`],
                ['Payment Mode', receiptItem.payment_mode === 'FEE' ? 'Added to Fees' : 'Paid Direct'],
                ['Payment Status', receiptItem.payment_status],
                ['Kit Status', receiptItem.status],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
              {receiptItem.remarks && (
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Remarks</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">{receiptItem.remarks}</div>
                </div>
              )}
            </div>
            <div className="text-center pt-2 text-[10px] text-slate-400">✅ Payment received. Thank you for choosing Sports Academy Pro.</div>
          </div>
        )}
      </StandardModal>
    </div>
  );
}

// ─── ASSIGNMENTS TAB (wrapper with sub-tabs) ──────────────────────────────────
function AssignmentsTab({ onAssignStudent, onAssignCoach, refreshKey }) {
  const [subTab, setSubTab] = useState('coach');

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1 gap-1 border border-slate-200 dark:border-slate-700 max-w-sm">
        {[
          { id: 'coach',   label: 'Coach Assignments',   icon: ShieldCheck },
          { id: 'student', label: 'Student Assignments', icon: GraduationCap },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === tab.id
                ? tab.id === 'coach'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/40'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {subTab === 'coach'   && <CoachAssignmentsSection onAssignCoach={onAssignCoach} refreshKey={refreshKey} />}
          {subTab === 'student' && <StudentAssignmentsSection onAssignStudent={onAssignStudent} refreshKey={refreshKey} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [message, flash] = useFlash();

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const res = await adminGet('/admin/inventory/kits/assignments'); setAssignments(res.data || []); }
    catch (err) { flash(err.message || 'Failed to load payments', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkPaid = async item => {
    if (!window.confirm(`Mark payment as PAID for "${item.student?.name}"?`)) return;
    try { await adminPatch(`/admin/inventory/kits/assignments/${item.assignment_id}/payment`, { payment_method: 'cash' }); flash('Payment marked as paid!'); loadData(); }
    catch (err) { flash(err.message || 'Failed', 'error'); }
  };

  const filtered = assignments.filter(a => filter === 'unpaid' ? a.payment_status === 'UNPAID' : filter === 'paid' ? a.payment_status === 'PAID' : true);
  const unpaidCount = assignments.filter(a => a.payment_status === 'UNPAID').length;
  const paidCount = assignments.filter(a => a.payment_status === 'PAID').length;
  const totalRevenue = assignments.filter(a => a.payment_status === 'PAID').reduce((s, a) => s + Number(a.kit?.selling_price || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FlashBanner message={message} />
      <div><h2 className="text-xl font-extrabold text-foreground">Kit Payments</h2><p className="text-xs text-muted-foreground mt-0.5">Track and manage payment status for all student kit assignments.</p></div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', val: unpaidCount, color: unpaidCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/30 dark:border-slate-700' },
          { label: 'Paid', val: paidCount, color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' },
          { label: 'Revenue Collected', val: `₹${totalRevenue}`, color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400' },
        ].map((s, i) => <div key={i} className={`p-5 rounded-2xl border shadow-sm ${s.color}`}><div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">{s.label}</div><div className="text-3xl font-black">{s.val}</div></div>)}
      </div>
      <div className="flex gap-2">
        {[['all','All'],['unpaid','Unpaid'],['paid','Paid']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${filter === val ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{lbl}</button>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center"><CreditCard className="w-12 h-12 text-slate-300 mx-auto stroke-1" /><h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Records Found</h3><p className="text-slate-500 dark:text-slate-400 mt-1">No payment records for the current filter.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800"><th className="p-4">Student</th><th className="p-4">Kit</th><th className="p-4">Sport</th><th className="p-4">Issue Date</th><th className="p-4">Mode</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {filtered.map(item => (
                  <tr key={item.assignment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.student?.name || '—'}</td>
                    <td className="p-4">{item.kit?.name || '—'}</td>
                    <td className="p-4 text-muted-foreground">{item.kit?.sport?.name || '—'}</td>
                    <td className="p-4 text-muted-foreground">{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '—'}</td>
                    <td className="p-4"><span className="text-xs font-semibold uppercase">{item.payment_mode === 'FEE' ? 'Add to Fees' : 'Paid Direct'}</span></td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">₹{Number(item.kit?.selling_price || 0)}</td>
                    <td className="p-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 animate-pulse'}`}>{item.payment_status}</span></td>
                    <td className="p-4 text-right">
                      {item.payment_status === 'UNPAID' && <button onClick={() => handleMarkPaid(item)} className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-lg transition"><DollarSign className="w-3.5 h-3.5" /> Mark Paid</button>}
                      {item.payment_status === 'PAID' && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 justify-end"><CheckCircle className="w-3.5 h-3.5" /> Paid</span>}
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

export default function InventorySportsKits() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [message, flash] = useFlash();

  // Shared Modal States
  const [showAssignTargetPrompt, setShowAssignTargetPrompt] = useState(false);
  const [promptKit, setPromptKit] = useState(null);

  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [existingAssignments, setExistingAssignments] = useState(0);
  const [isAssigningStudent, setIsAssigningStudent] = useState(false);
  const [studentAssignForm, setStudentAssignForm] = useState({
    kit_id: '',
    student_id: '',
    quantity: 1,
    unit_price: 0,
    discount: 0,
    issue_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    remarks: '',
    payment_mode: 'FEE',
    payment_method: 'cash'
  });

  const [showCoachAssignModal, setShowCoachAssignModal] = useState(false);
  const [isAssigningCoach, setIsAssigningCoach] = useState(false);
  const [editingAssignmentCoach, setEditingAssignmentCoach] = useState(null);
  const [coachAssignForm, setCoachAssignForm] = useState({
    coach_id: '',
    kit_id: '',
    quantity: 1,
    notes: '',
    assignment_date: new Date().toISOString().split('T')[0]
  });

  const [parentStudents, setParentStudents] = useState([]);
  const [parentKits, setParentKits] = useState([]);
  const [parentCoaches, setParentCoaches] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadParentData = useCallback(async () => {
    try {
      const [studentsRes, kitsRes, coachesRes] = await Promise.all([
        adminGet('/admin/students'),
        adminGet('/admin/inventory/kits'),
        adminGet('/admin/coaches')
      ]);
      setParentStudents(studentsRes.data?.students || studentsRes.data || []);
      setParentKits(kitsRes.data || []);
      setParentCoaches(coachesRes.data?.coaches || coachesRes.data || []);
    } catch (err) {
      console.error('Failed to load parent lists for inventory modals', err);
    }
  }, []);

  useEffect(() => {
    loadParentData();
  }, [loadParentData, refreshKey]);

  const openAssignPrompt = (kit) => {
    if (kit.available_qty <= 0) {
      flash('This kit is out of stock!', 'error');
      return;
    }
    setPromptKit(kit);
    setShowAssignTargetPrompt(true);
  };

  const checkExistingAssignments = async (studentId, kitId) => {
    try {
      const res = await adminGet(`/admin/inventory/kits/assignments?kit_id=${kitId}&student_id=${studentId}`);
      const activeAssignments = (res.data || []).filter(a => a.status === 'ACTIVE');
      setExistingAssignments(activeAssignments.length);
    } catch {
      setExistingAssignments(0);
    }
  };

  const openAssignStudent = (kit, student) => {
    setSelectedKit(kit);
    setAssigningStudent(student);
    setStudentSearch('');
    setSelectedStudent(student || null);
    setStudentAssignForm({
      kit_id: kit ? kit.kit_id : '',
      student_id: student ? student.student_id : '',
      quantity: 1,
      unit_price: kit ? (kit.selling_price || 0) : 0,
      discount: 0,
      issue_date: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      remarks: '',
      payment_mode: 'FEE',
      payment_method: 'cash'
    });
    setExistingAssignments(0);
    if (student && kit) {
      checkExistingAssignments(student.student_id, kit.kit_id);
    }
    setShowStudentAssignModal(true);
  };

  const openAssignCoach = (kit, editingAssignment = null) => {
    setSelectedKit(kit || (editingAssignment ? editingAssignment.kit : null));
    setEditingAssignmentCoach(editingAssignment);
    setCoachAssignForm({
      coach_id: editingAssignment ? editingAssignment.coach_id : '',
      kit_id: kit ? kit.kit_id : (editingAssignment ? editingAssignment.kit_id : ''),
      quantity: editingAssignment ? editingAssignment.quantity : 1,
      notes: editingAssignment ? (editingAssignment.notes || '') : '',
      assignment_date: editingAssignment && editingAssignment.assignment_date 
        ? new Date(editingAssignment.assignment_date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]
    });
    setShowCoachAssignModal(true);
  };

  const handleStudentChange = (studentId) => {
    const student = parentStudents.find(s => Number(s.student_id) === Number(studentId));
    setStudentAssignForm(prev => ({ ...prev, student_id: studentId }));
    setSelectedStudent(student || null);
    setStudentSearch('');
    if (studentId && selectedKit) {
      checkExistingAssignments(studentId, selectedKit.kit_id);
    } else {
      setExistingAssignments(0);
    }
  };

  const handleKitSelectChange = (kitId) => {
    const kit = parentKits.find(k => k.kit_id === parseInt(kitId, 10));
    setSelectedKit(kit || null);
    setStudentAssignForm(prev => ({
      ...prev,
      kit_id: kitId,
      unit_price: kit ? (kit.selling_price || 0) : 0
    }));
    if (studentAssignForm.student_id && kit) {
      checkExistingAssignments(studentAssignForm.student_id, kit.kit_id);
    }
  };

  const calculateFinalAmount = () => {
    const qty = parseInt(studentAssignForm.quantity) || 1;
    const price = parseFloat(studentAssignForm.unit_price) || 0;
    const discount = parseFloat(studentAssignForm.discount) || 0;
    return Math.max(0, (price * qty) - discount);
  };

  const submitStudentAssignment = async (e) => {
    e.preventDefault();
    if (!studentAssignForm.student_id) { flash('Select a student', 'error'); return; }
    if (!studentAssignForm.kit_id) { flash('Select a kit', 'error'); return; }
    const qty = parseInt(studentAssignForm.quantity, 10) || 1;
    if (qty <= 0) { flash('Quantity must be at least 1', 'error'); return; }
    
    setIsAssigningStudent(true);
    try {
      await adminPost(`/admin/inventory/kits/${studentAssignForm.kit_id}/assign`, {
        student_id: parseInt(studentAssignForm.student_id, 10),
        quantity: qty,
        unit_price: parseFloat(studentAssignForm.unit_price) || 0,
        discount: parseFloat(studentAssignForm.discount) || 0,
        issue_date: studentAssignForm.issue_date,
        expected_return_date: studentAssignForm.expected_return_date || null,
        remarks: studentAssignForm.remarks,
        payment_mode: studentAssignForm.payment_mode,
        payment_method: studentAssignForm.payment_method,
      });
      flash('Kit assigned successfully!');
      setShowStudentAssignModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      flash(err.message || 'Failed to assign', 'error');
    } finally {
      setIsAssigningStudent(false);
    }
  };

  const submitCoachAssignment = async (e) => {
    e.preventDefault();
    if (!coachAssignForm.coach_id) { flash('Select a coach', 'error'); return; }
    if (!coachAssignForm.kit_id) { flash('Select a kit', 'error'); return; }
    const qty = parseInt(coachAssignForm.quantity, 10) || 1;
    if (qty <= 0) { flash('Quantity must be at least 1', 'error'); return; }
    
    setIsAssigningCoach(true);
    try {
      if (editingAssignmentCoach) {
        await adminPut(`/admin/inventory/kits/coach-assignments/${editingAssignmentCoach.id}`, {
          quantity: qty,
          notes: coachAssignForm.notes
        });
        flash('Assignment updated!');
      } else {
        await adminPost('/admin/inventory/kits/coach-assignments', {
          coach_id: parseInt(coachAssignForm.coach_id, 10),
          kit_id: parseInt(coachAssignForm.kit_id, 10),
          quantity: qty,
          notes: coachAssignForm.notes,
          assignment_date: coachAssignForm.assignment_date
        });
        flash('Kit assigned to coach!');
      }
      setShowCoachAssignModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      flash(err.message || 'Operation failed', 'error');
    } finally {
      setIsAssigningCoach(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      <FlashBanner message={message} />
      
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
            Kit management · Coach & Student assignment · Payment tracking
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
          {activeTab === 'kits'        && <KitsTab onAssignKit={openAssignPrompt} refreshKey={refreshKey} />}
          {activeTab === 'assignments' && <AssignmentsTab onAssignStudent={openAssignStudent} onAssignCoach={openAssignCoach} refreshKey={refreshKey} />}
          {activeTab === 'payments'    && <PaymentsTab />}
        </motion.div>
      </AnimatePresence>

      {/* Assignment Target Prompt Modal */}
      {showAssignTargetPrompt && (
        <StandardModal
          isOpen={showAssignTargetPrompt}
          onClose={() => setShowAssignTargetPrompt(false)}
          title={`Assign Kit: ${promptKit?.name}`}
          subtitle="Choose the assignment target"
          size="sm"
        >
          <div className="p-4 space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Would you like to assign this kit to a coach or a student?</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAssignTargetPrompt(false);
                  openAssignCoach(promptKit);
                }}
                className="py-3 px-4 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded-xl text-xs transition flex flex-col items-center justify-center gap-1.5 shadow"
              >
                <ShieldCheck className="w-5 h-5 text-indigo-200" />
                <span>Assign to Coach</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssignTargetPrompt(false);
                  openAssignStudent(promptKit, null);
                }}
                className="py-3 px-4 bg-emerald-650 hover:bg-emerald-755 text-white font-bold rounded-xl text-xs transition flex flex-col items-center justify-center gap-1.5 shadow"
              >
                <GraduationCap className="w-5 h-5 text-emerald-200" />
                <span>Assign to Student</span>
              </button>
            </div>
          </div>
        </StandardModal>
      )}

      {/* Reusable Student Assignment Modal */}
      {showStudentAssignModal && (
        <StandardModal
          isOpen={showStudentAssignModal}
          onClose={() => setShowStudentAssignModal(false)}
          title="Assign Kit to Student"
          subtitle={selectedKit ? selectedKit.name : 'Select kit and student'}
          size="md"
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowStudentAssignModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
              <button onClick={submitStudentAssignment} disabled={isAssigningStudent || !studentAssignForm.student_id} className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">
                {isAssigningStudent ? 'Assigning…' : 'Confirm'}
              </button>
            </div>
          }
        >
          <form onSubmit={submitStudentAssignment} className="space-y-4">
            {existingAssignments > 0 && (
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/50 rounded-xl p-3 text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400">ℹ️ Info:</span> Student already has {existingAssignments} × {selectedKit?.name} assigned.
              </div>
            )}
            
            {!selectedKit ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Kit *</label>
                <select
                  value={studentAssignForm.kit_id}
                  onChange={e => handleKitSelectChange(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  required
                >
                  <option value="">— Choose a Kit —</option>
                  {parentKits.filter(k => k.available_qty > 0 && k.status === 'ACTIVE').map(k => (
                    <option key={k.kit_id} value={k.kit_id}>
                      {k.name} (Avail: {k.available_qty}) — ₹{Number(k.selling_price)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="text-slate-500 dark:text-slate-400 font-semibold uppercase">Total</div><div className="font-bold text-slate-900 dark:text-white">{selectedKit?.total_qty || 0}</div></div>
                  <div><div className="text-slate-500 dark:text-slate-400 font-semibold uppercase">Available</div><div className="font-bold text-emerald-600 dark:text-emerald-400">{selectedKit?.available_qty || 0}</div></div>
                  <div><div className="text-slate-500 dark:text-slate-400 font-semibold uppercase">Assigned</div><div className="font-bold text-slate-900 dark:text-white">{selectedKit?.assigned_qty || 0}</div></div>
                </div>
              </div>
            )}

            {!assigningStudent ? (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Search *</label>
                <input
                  type="text"
                  placeholder="Search by Name, ID, Mobile, or Admission Number..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  required={!selectedStudent}
                />
                
                {selectedStudent && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">{selectedStudent.name}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-500">ID: #{selectedStudent.student_id} | {selectedStudent.batch?.name || 'No Batch'} | {selectedStudent.phone || 'No Mobile'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentAssignForm(prev => ({ ...prev, student_id: '' }));
                          setExistingAssignments(0);
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {studentSearch && !selectedStudent && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-slate-955">
                    {parentStudents
                      .filter(s => {
                        const search = studentSearch.toLowerCase();
                        return (
                          s.name?.toLowerCase().includes(search) ||
                          String(s.student_id).includes(search) ||
                          s.phone?.includes(search) ||
                          s.admission_number?.toLowerCase().includes(search)
                        );
                      })
                      .map(s => {
                        const isHighlighted = selectedStudent?.student_id === s.student_id;
                        return (
                          <div
                            key={s.student_id}
                            onClick={() => handleStudentChange(s.student_id)}
                            className={`p-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition ${
                              isHighlighted 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold border-l-4 border-l-emerald-500' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{s.student_id} | {s.batch?.name || 'No Batch'} | {s.phone || 'No Mobile'}</div>
                          </div>
                        );
                      })}
                    {parentStudents.filter(s => {
                      const search = studentSearch.toLowerCase();
                      return (
                        s.name?.toLowerCase().includes(search) ||
                        String(s.student_id).includes(search) ||
                        s.phone?.includes(search) ||
                        s.admission_number?.toLowerCase().includes(search)
                      );
                    }).length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500 italic">No matching students found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Assigning to Student</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{assigningStudent.name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">#{assigningStudent.student_id}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity *</label><input type="number" min="1" max={selectedKit?.available_qty || 9999} value={studentAssignForm.quantity} onChange={e => setStudentAssignForm({ ...studentAssignForm, quantity: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" required /></div>
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Price (₹)</label><input type="number" min="0" step="0.01" value={studentAssignForm.unit_price} onChange={e => setStudentAssignForm({ ...studentAssignForm, unit_price: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            </div>
            
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount (₹) <span className="text-xs font-normal text-slate-500">(Optional)</span></label><input type="number" min="0" step="0.01" value={studentAssignForm.discount} onChange={e => setStudentAssignForm({ ...studentAssignForm, discount: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Final Amount:</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">₹{calculateFinalAmount().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Date</label><input type="date" value={studentAssignForm.issue_date} onChange={e => setStudentAssignForm({ ...studentAssignForm, issue_date: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Return</label><input type="date" value={studentAssignForm.expected_return_date} onChange={e => setStudentAssignForm({ ...studentAssignForm, expected_return_date: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label><select value={studentAssignForm.payment_mode} onChange={e => setStudentAssignForm({ ...studentAssignForm, payment_mode: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"><option value="FEE">Add to Fees</option><option value="PAID">Paid Direct</option></select></div>
              <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label><select value={studentAssignForm.payment_method} onChange={e => setStudentAssignForm({ ...studentAssignForm, payment_method: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option></select></div>
            </div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks</label><textarea value={studentAssignForm.remarks} onChange={e => setStudentAssignForm({ ...studentAssignForm, remarks: e.target.value })} rows={2} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" /></div>
          </form>
        </StandardModal>
      )}

      {/* Reusable Coach Assignment Modal */}
      {showCoachAssignModal && (
        <StandardModal
          isOpen={showCoachAssignModal}
          onClose={() => setShowCoachAssignModal(false)}
          title={editingAssignmentCoach ? 'Edit Coach Assignment' : 'Assign Kit to Coach'}
          subtitle={editingAssignmentCoach ? `Editing assignment for ${editingAssignmentCoach.coach?.name}` : 'Admin assigns kit stock to a coach'}
          size="md"
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCoachAssignModal(false)} className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
              <button onClick={submitCoachAssignment} disabled={isAssigningCoach} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition">
                {isAssigningCoach ? 'Saving…' : editingAssignmentCoach ? 'Update' : 'Assign'}
              </button>
            </div>
          }
        >
          <form onSubmit={submitCoachAssignment} className="space-y-4">
            {!editingAssignmentCoach && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Coach *</label>
                <select value={coachAssignForm.coach_id} onChange={e => setCoachAssignForm({ ...coachAssignForm, coach_id: e.target.value })} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" required>
                  <option value="">— Choose Coach —</option>
                  {parentCoaches.map(c => <option key={c.coach_id} value={c.coach_id}>{c.name}{c.specialization ? ` (${c.specialization})` : ''}</option>)}
                </select>
              </div>
            )}

            {!editingAssignmentCoach && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Kit *</label>
                <select value={coachAssignForm.kit_id} onChange={e => {
                  const kitId = e.target.value;
                  const kit = parentKits.find(k => k.kit_id === parseInt(kitId, 10));
                  setSelectedKit(kit || null);
                  setCoachAssignForm({ ...coachAssignForm, kit_id: kitId });
                }} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" required>
                  <option value="">— Choose Kit —</option>
                  {parentKits.filter(k => k.status === 'ACTIVE').map(k => <option key={k.kit_id} value={k.kit_id}>{k.name} — {k.sport?.name || ''} (Avail: {k.available_qty}) ₹{Number(k.selling_price)}</option>)}
                </select>
                {selectedKit && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Available stock:</span>
                    <span className={`font-bold ${selectedKit.available_qty === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{selectedKit.available_qty}</span>
                  </div>
                )}
              </div>
            )}

            {editingAssignmentCoach && (
              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Coach:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{editingAssignmentCoach.coach?.name}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Kit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{editingAssignmentCoach.kit?.name}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Already assigned to students:</span>
                  <span className="font-bold text-amber-600">{editingAssignmentCoach.quantity - editingAssignmentCoach.remaining_qty}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity *</label>
                <input
                  type="number" min="1"
                  value={coachAssignForm.quantity}
                  onChange={e => setCoachAssignForm({ ...coachAssignForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignment Date</label>
                <input
                  type="date"
                  disabled={!!editingAssignmentCoach}
                  value={coachAssignForm.assignment_date}
                  onChange={e => setCoachAssignForm({ ...coachAssignForm, assignment_date: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                rows="2"
                value={coachAssignForm.notes}
                onChange={e => setCoachAssignForm({ ...coachAssignForm, notes: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
