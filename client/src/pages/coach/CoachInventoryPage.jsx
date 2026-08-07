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
  ArrowRightLeft,
  X
} from 'lucide-react';
import Loader from '../../components/Loader';
import { coachGet, coachPost } from '../../api/client';

const PRIORITIES = ['Low', 'Medium', 'High'];
const REQUEST_TYPES = ['New', 'Additional', 'Replacement', 'Repair'];

export default function CoachInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);

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
      const [assignmentsRes, requestsRes] = await Promise.all([
        coachGet('/coach/inventory'),
        coachGet('/coach/inventory/requests')
      ]);

      setAssignments(assignmentsRes?.data || []);
      setRequests(requestsRes?.data || []);
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

  if (loading) {
    return (
      <div className="p-2 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6 text-left">
      
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Equipment & Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              View assigned gear or submit repair and replacement request tickets to administration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleOpenRequest}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 font-black uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Request Gear / Action
          </button>
        </div>
      </motion.div>

      {/* Message Notifications Alert Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
              message.type === 'error'
                ? 'bg-card border-l-4 border-l-rose-500 text-rose-500 border-y-border border-r-border'
                : 'bg-card border-l-4 border-l-emerald-500 text-emerald-500 border-y-border border-r-border'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-550" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
            <span className="text-xs">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation Menu */}
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-border/60 w-fit">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'assigned'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Assigned Gear
          <span className="bg-slate-200/50 dark:bg-slate-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {assignments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Request Tickets
          <span className="bg-slate-200/50 dark:bg-slate-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {requests.length}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Assigned Gear View */}
        {activeTab === 'assigned' && (
          <div className="space-y-6">
            {assignments.length === 0 ? (
              <div className="p-16 text-center bg-card rounded-2xl border border-dashed border-border shadow-sm">
                <Package className="w-10 h-10 text-muted-foreground/60 mx-auto stroke-1" />
                <h3 className="mt-4 text-base font-bold text-foreground">No Equipment Assigned</h3>
                <p className="text-muted-foreground text-xs font-semibold mt-1">You do not have any sports equipment checked out from storage.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {assignments.map((asgn) => {
                  const activeQty = asgn.assigned_qty - asgn.returned_qty;
                  if (activeQty <= 0) return null;

                  return (
                    <motion.div
                      key={asgn.assignment_id}
                      layout
                      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Image Preview Container */}
                        <div className="relative h-40 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center border-b border-border/60">
                          {asgn.item?.image_url ? (
                            <img src={asgn.item.image_url} alt={asgn.item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-12 h-12 text-muted-foreground/40 stroke-1" />
                          )}
                          <span className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                            {asgn.item?.category}
                          </span>
                        </div>

                        {/* Content Info */}
                        <div className="p-4 space-y-2.5 text-left">
                          <div>
                            <h3 className="font-extrabold text-sm text-foreground truncate">{asgn.item?.name}</h3>
                            {asgn.item?.sport?.name && (
                              <span className="inline-block bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded font-bold mt-1">
                                {asgn.item.sport.name}
                              </span>
                            )}
                          </div>

                          {/* Counts Grid */}
                          <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-border text-center text-xs">
                            <div>
                              <span className="text-[8px] text-muted-foreground uppercase font-bold block">Assigned</span>
                              <span className="font-bold text-foreground">{asgn.assigned_qty}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-muted-foreground uppercase font-bold block">Returned</span>
                              <span className="font-bold text-muted-foreground">{asgn.returned_qty}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-emerald-600 uppercase font-bold block">In Hand</span>
                              <span className="font-extrabold text-emerald-600">{activeQty}</span>
                            </div>
                          </div>

                          {asgn.notes && (
                            <p className="text-[10px] text-muted-foreground italic bg-slate-50/50 p-2 rounded border border-border">
                              "{asgn.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Checkout Date */}
                      <div className="p-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/10 text-[9px] text-muted-foreground font-bold flex items-center gap-1.5 justify-center uppercase tracking-wider">
                        <Calendar className="w-3 h-3" /> Checkout: {new Date(asgn.assigned_date).toLocaleDateString()}
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
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm text-left">
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
              <h2 className="text-base font-black text-foreground">Action Tickets History</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">List of equipment requests and repair ticket approvals</p>
            </div>

            {requests.length === 0 ? (
              <div className="p-16 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/60 mx-auto stroke-1" />
                <h3 className="mt-4 text-base font-bold text-foreground">No Request Tickets Filed</h3>
                <p className="text-muted-foreground text-xs font-semibold mt-1">You haven't submitted any equipment action tickets yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Requested At</th>
                      <th className="p-4">Ticket Type</th>
                      <th className="p-4">Equipment Item</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {requests.map((req) => (
                      <tr key={req.request_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 text-muted-foreground font-semibold">{new Date(req.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-foreground">
                          <span className="badge bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-black uppercase">
                            {req.type}
                          </span>
                        </td>
                        <td className="p-4 text-foreground">
                          {req.item?.name || req.item_name_new}
                        </td>
                        <td className="p-4 text-center text-foreground">{req.quantity}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold ${req.priority === 'High' ? 'text-rose-600' : req.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'
                            }`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-muted-foreground" title={req.reason}>{req.reason}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${req.status === 'Pending'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : req.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : req.status === 'Rejected'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground italic max-w-xs truncate" title={req.remarks}>
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
      </div>

      {/* EQUIPMENT REQUEST MODAL */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-3xl max-w-md w-full shadow-2xl p-6 relative space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <h3 className="text-base font-black text-foreground">
                  Submit Gear Action Request
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs font-bold text-left">
                {/* Request Type */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Request Type</label>
                  <select
                    value={requestForm.type}
                    onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                    className="input-field text-xs py-2.5 px-3 bg-card w-full"
                  >
                    {REQUEST_TYPES.map(t => <option key={t} value={t}>{t} Equipment</option>)}
                  </select>
                </div>

                {/* Equipment Item Selection */}
                {requestForm.type !== 'New' ? (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Select Equipment Item</label>
                    <select
                      required
                      value={requestForm.item_id}
                      onChange={(e) => setRequestForm({ ...requestForm, item_id: e.target.value })}
                      className="input-field text-xs py-2.5 px-3 bg-card w-full"
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
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Equipment Name</label>
                    <input
                      type="text"
                      required
                      value={requestForm.item_name_new}
                      onChange={(e) => setRequestForm({ ...requestForm, item_name_new: e.target.value })}
                      className="input-field text-xs py-2.5 px-3 w-full"
                      placeholder="e.g. Boxing Gloves 12oz"
                    />
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={requestForm.quantity}
                    onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                    className="input-field text-xs py-2.5 px-3 w-full"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Priority Level</label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="input-field text-xs py-2.5 px-3 bg-card w-full"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Justification Reason</label>
                  <textarea
                    rows="3"
                    required
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    className="input-field text-xs py-2.5 px-3 bg-card w-full resize-none font-semibold"
                    placeholder="Describe specific reasons (e.g. racquet strings broke during lesson)..."
                  />
                </div>

                {/* Proof File Attachment */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Attach Image / Document (Optional)</label>
                  <div className="relative border border-dashed border-border hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl p-4 text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[11px] text-muted-foreground block font-bold">
                      {proofFile ? proofFile.name : '📸 Upload picture attachment'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="btn btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs py-2 px-6"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
