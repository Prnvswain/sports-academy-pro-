import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Upload,
  Calendar,
  Layers,
  Inbox,
  ArrowRightLeft
} from 'lucide-react';
import Loader from '../../components/Loader';
import { coachGet, coachPost } from '../../api/client';

const PRIORITIES = ['Low', 'Medium', 'High'];
const REQUEST_TYPES = ['New', 'Additional', 'Replacement', 'Repair'];

export default function CoachInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]); // Available items in academy to request additional from

  // Search & Navigation
  const [activeTab, setActiveTab] = useState('assigned'); // assigned, requests

  // Message notifications
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'New', // New, Additional, Replacement, Repair
    item_id: '', // for Additional, Replacement, Repair
    item_name_new: '', // for New
    quantity: '1',
    priority: 'Medium',
    reason: '',
  });
  const [proofFile, setProofFile] = useState(null);

  // Helper alert flash
  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Load coach data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsRes, requestsRes, catalogRes] = await Promise.all([
        coachGet('/coach/inventory'),
        coachGet('/coach/inventory/requests'),
        coachGet('/coach/inventory') // Fetch all items to select from (or reuse assignments for repair/replace)
      ]);

      setAssignments(assignmentsRes?.data || []);
      setRequests(requestsRes?.data || []);

      // Let's also fetch general academy items list so coach can request "Additional" quantity of existing catalog items
      // Wait, we can fetch from a generic public list or fetch admin inventory.
      // For additional items, we can fetch `/admin/inventory` but since coaches are authenticated, let's fetch coach items
      // or we can allow coaches to request additional gear by typing its name, or selecting from currently assigned ones.
      // If we query `/api/v1/coach/inventory` it returns coach's assigned items, which is perfect for selecting for Repair/Replacement.
      // Let's also fetch general items list if there's an API, otherwise we can let them input item name or select from assigned items!
      // In fact, let's select from assigned items for Repair/Replacement/Additional, and let them type the name for New equipment!
      // This is extremely simple and avoids backend endpoint pollution!
    } catch (err) {
      console.error(err);
      flashMessage(err.message || 'Failed to retrieve coach inventory data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Request Submit
  const handleOpenRequest = () => {
    setRequestForm({
      type: 'New',
      item_id: assignments[0]?.item_id || '',
      item_name_new: '',
      quantity: '1',
      priority: 'Medium',
      reason: '',
    });
    setProofFile(null);
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('type', requestForm.type);
    formData.append('quantity', requestForm.quantity);
    formData.append('priority', requestForm.priority);
    formData.append('reason', requestForm.reason);

    if (requestForm.type === 'New') {
      if (!requestForm.item_name_new) {
        flashMessage('Please specify the new equipment name!', 'error');
        return;
      }
      formData.append('item_name_new', requestForm.item_name_new);
    } else {
      if (!requestForm.item_id) {
        flashMessage('Please select an equipment item!', 'error');
        return;
      }
      formData.append('item_id', requestForm.item_id);
    }

    if (proofFile) {
      formData.append('proof_file', proofFile);
    }

    try {
      await coachPost('/coach/inventory/requests', formData);
      flashMessage('Equipment request submitted successfully to admin!');
      setShowRequestModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to submit request', 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Equipment & Inventory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View equipment in your possession and file replacement or repair requests.
          </p>
        </div>
        <button
          onClick={handleOpenRequest}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Request Gear / Action
        </button>
      </div>

      {/* Message Notifications */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
              }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'assigned'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          My Assigned Gear
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold">
            {assignments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 ${activeTab === 'requests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          My Request Tickets
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold">
            {requests.length}
          </span>
        </button>
      </div>

      {/* Assigned Gear View */}
      {activeTab === 'assigned' && (
        <div className="space-y-6">
          {assignments.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">No Equipment Assigned</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">You do not have any sports equipment checked out from storage.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((asgn) => {
                const activeQty = asgn.assigned_qty - asgn.returned_qty;
                if (activeQty <= 0) return null;

                return (
                  <motion.div
                    key={asgn.assignment_id}
                    layout
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-880 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview Container */}
                      <div className="relative h-44 bg-slate-105 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-850">
                        {asgn.item?.image_url ? (
                          <img src={asgn.item.image_url} alt={asgn.item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-14 h-14 text-slate-300 dark:text-slate-700 stroke-1" />
                        )}
                        <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm">
                          {asgn.item?.category}
                        </span>
                      </div>

                      {/* Content Info */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{asgn.item?.name}</h3>
                          {asgn.item?.sport?.name && (
                            <span className="inline-block bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-md mt-1 font-semibold">
                              {asgn.item.sport.name}
                            </span>
                          )}
                        </div>

                        {/* Counts Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned</span>
                            <span className="text-base font-bold text-slate-700 dark:text-slate-350">{asgn.assigned_qty}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Returned</span>
                            <span className="text-base font-bold text-slate-500">{asgn.returned_qty}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 uppercase font-semibold block">In Hand</span>
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-450">{activeQty}</span>
                          </div>
                        </div>

                        {asgn.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                            "{asgn.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Checkout Date */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                      <Calendar className="w-3.5 h-3.5" /> Checked out: {new Date(asgn.assigned_date).toLocaleDateString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Requests History View */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Request History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">List of equipment action tickets submitted for admin approvals.</p>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">No Request Logs</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">You haven't submitted any equipment request tickets yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Requested At</th>
                    <th className="p-4">Ticket Type</th>
                    <th className="p-4">Equipment Item</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Admin Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-350">
                  {requests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-4 text-slate-400">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {req.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {req.item?.name || req.item_name_new}
                      </td>
                      <td className="p-4 text-center font-bold">{req.quantity}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold ${req.priority === 'High' ? 'text-rose-600 font-bold' : req.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${req.status === 'Pending'
                            ? 'bg-slate-100 text-slate-650'
                            : req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : req.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-805 dark:bg-rose-950 dark:text-rose-400'
                                : req.status === 'Ordered'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400'
                                  : 'bg-indigo-100 text-indigo-805 dark:bg-indigo-950 dark:text-indigo-400'
                          }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={req.remarks}>
                        {req.remarks || <span className="text-slate-300 dark:text-slate-700">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── REQUEST MODAL LAYER ─────────────────────────────────────────────── */}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full shadow-2xl p-6 relative space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Submit Equipment Request
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4 text-sm">
              {/* Request Type */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Request Type *</label>
                <select
                  value={requestForm.type}
                  onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {REQUEST_TYPES.map(t => <option key={t} value={t}>{t} Equipment</option>)}
                </select>
              </div>

              {/* Equipment Item Selection (for Replacement/Repair/Additional) */}
              {requestForm.type !== 'New' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Select Equipment Item *</label>
                  <select
                    required
                    value={requestForm.item_id}
                    onChange={(e) => setRequestForm({ ...requestForm, item_id: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>-- Select Assigned Item --</option>
                    {assignments.map(asgn => (
                      <option key={asgn.item_id} value={asgn.item_id}>
                        {asgn.item?.name} ({asgn.item?.category})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Equipment Name for NEW items */
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={requestForm.item_name_new}
                    onChange={(e) => setRequestForm({ ...requestForm, item_name_new: e.target.value })}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. Boxing Gloves 12oz"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={requestForm.quantity}
                  onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Priority Level *</label>
                <select
                  value={requestForm.priority}
                  onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reason / Justification *</label>
                <textarea
                  rows="3"
                  required
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  placeholder="Explain why this request is required (e.g. current racket string snapped during coaching)..."
                />
              </div>

              {/* Proof File Attachment */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Attachment Proof (Image/PDF/Video)</label>
                <div className="flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-750 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/20 cursor-pointer relative transition">
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-center text-slate-500 space-y-1">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="text-xs font-semibold block">
                      {proofFile ? proofFile.name : 'Click or Drag file to attach'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
