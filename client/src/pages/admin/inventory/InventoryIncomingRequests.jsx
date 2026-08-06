import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Download,
  AlertCircle,
  CheckCircle,
  Notebook
} from 'lucide-react';
import Loader from '../../../components/Loader';
import StandardModal from '../../../components/StandardModal';
import { adminGet, adminPatch } from '../../../api/client';

export default function InventoryIncomingRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestActionForm, setRequestActionForm] = useState({
    status: 'Approved',
    remarks: ''
  });
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' });

  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminGet('/admin/inventory/requests');
      setRequests(response?.data || []);
    } catch (err) {
      console.error(err);
      flashMessage(err.message || 'Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRequestAction = (request) => {
    setSelectedRequest(request);
    setRequestActionForm({
      status: 'Approved',
      remarks: ''
    });
    setShowActionModal(true);
  };

  const handleRequestAction = async (e) => {
    e.preventDefault();
    if (isUpdatingRequest) return;
    setIsUpdatingRequest(true);

    try {
      await adminPatch(`/admin/inventory/requests/${selectedRequest.request_id}`, {
        status: requestActionForm.status,
        remarks: requestActionForm.remarks
      });
      flashMessage('Request updated successfully');
      setShowActionModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to update request', 'error');
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            Incoming Requests
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            Manage equipment requests from coaches
          </p>
        </div>
      </motion.div>

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
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${req.type === 'New'
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
                      <span className={`text-xs font-semibold ${req.priority === 'High'
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : req.priority === 'Medium'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-254'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${req.status === 'Pending'
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

      <StandardModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title="Action Request"
        subtitle={selectedRequest?.item?.name || selectedRequest?.item_name_new}
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowActionModal(false)}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingRequest}
              onClick={handleRequestAction}
              className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition"
            >
              {isUpdatingRequest ? 'Updating...' : 'Update'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleRequestAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={requestActionForm.status}
                    onChange={e => setRequestActionForm({ ...requestActionForm, status: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
                  <textarea
                    value={requestActionForm.remarks}
                    onChange={e => setRequestActionForm({ ...requestActionForm, remarks: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    rows={3}
                  />
                </div>
        </form>
      </StandardModal>
    </div>
  );
}
