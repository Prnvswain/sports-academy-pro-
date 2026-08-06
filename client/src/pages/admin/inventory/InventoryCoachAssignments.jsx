import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Loader from '../../../components/Loader';
import StandardModal from '../../../components/StandardModal';
import { adminGet, adminPatch } from '../../../api/client';

const getDisplayLabel = (item) => {
  if (!item) return 'Unknown';
  if (item.category === 'Others' && item.name) return item.name;
  return item.category || item.name || 'Unknown';
};

export default function InventoryCoachAssignments() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [items, setItems] = useState([]);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTargetAssignment, setReturnTargetAssignment] = useState(null);
  const [returnForm, setReturnForm] = useState({
    qty: 1,
    notes: ''
  });
  const [isReturning, setIsReturning] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' });

  const flashMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsRes, coachesRes, itemsRes] = await Promise.all([
        adminGet('/admin/inventory/assignments'),
        adminGet('/admin/coaches'),
        adminGet('/admin/inventory')
      ]);
      setAssignments(assignmentsRes?.data || []);
      setCoaches(coachesRes?.data || coachesRes || []);
      setItems(itemsRes?.data || []);
    } catch (err) {
      console.error(err);
      flashMessage(err.message || 'Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenReturn = (assignment) => {
    setReturnTargetAssignment(assignment);
    setReturnForm({ qty: assignment.assigned_qty - assignment.returned_qty, notes: '' });
    setShowReturnModal(true);
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (isReturning) return;
    setIsReturning(true);

    try {
      await adminPatch(`/admin/inventory/assignments/${returnTargetAssignment.assignment_id}/return`, {
        qty: returnForm.qty,
        notes: returnForm.notes
      });
      flashMessage('Equipment returned successfully');
      setShowReturnModal(false);
      loadData();
    } catch (err) {
      flashMessage(err.message || 'Failed to return equipment', 'error');
    } finally {
      setIsReturning(false);
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
            Coach Assignments
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            Track equipment currently checked out by coaches
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
                        <span className="text-xs text-slate-400">{getDisplayLabel(asgn.item)}</span>
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

      <StandardModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return Equipment"
        subtitle={returnTargetAssignment?.item?.name}
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReturning}
              onClick={handleReturn}
              className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition"
            >
              {isReturning ? 'Returning...' : 'Return'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity to Return</label>
                  <input
                    type="number"
                    min="1"
                    max={returnTargetAssignment?.assigned_qty - returnTargetAssignment?.returned_qty || 1}
                    value={returnForm.qty}
                    onChange={e => setReturnForm({ ...returnForm, qty: parseInt(e.target.value) })}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                  <textarea
                    value={returnForm.notes}
                    onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    rows={2}
                  />
                </div>
        </form>
      </StandardModal>
    </div>
  );
}
