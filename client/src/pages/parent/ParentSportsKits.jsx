import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, DollarSign, List, FileText, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';
import { useActiveStudent } from '../../context/ActiveStudentContext';

export default function ParentSportsKits() {
  const { activeStudent, loading: studentLoading } = useActiveStudent();
  const [loading, setLoading] = useState(true);
  const [kits, setKits] = useState([]);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!activeStudent) return;
    setLoading(true);
    setError('');
    try {
      const response = await parentGet(`/parent/sports-kits?student_id=${activeStudent.student_id}`);
      setKits(response.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch sports kits details.');
    } finally {
      setLoading(false);
    }
  }, [activeStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadReceipt = (a) => {
    window.alert(`Receipt for "${a.kit?.name}" is being processed. Direct download link will be available once payment is cleared by accounts.`);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Sports Kits Inventory
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Monitor training kits assigned to your children, items included, pricing and payments
          </p>
        </div>
      </motion.div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Kits Catalog List */}
      {kits.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-2xl shadow-sm">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto stroke-1" />
          <h3 className="mt-4 text-base font-bold text-foreground">No kits assigned</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Training kits will appear here once issued by the academy administration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kits.map((a) => {
            const items = JSON.parse(a.kit?.items || '[]');
            const isUnpaid = a.payment_status === 'UNPAID';
            const isActive = a.status === 'ACTIVE';

            return (
              <motion.div
                key={a.assignment_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-primary/10 text-primary font-black uppercase px-2 py-0.5 rounded">
                        {a.student?.name}
                      </span>
                      <h3 className="text-lg font-black text-foreground mt-1.5">{a.kit?.name}</h3>
                      <p className="text-xs text-muted-foreground">{a.kit?.sport?.name || 'Sports Program'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-semibold">
                          Qty: {a.quantity || 1}
                        </span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-semibold">
                          Unit: ₹{Number(a.unit_price || a.kit?.selling_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-foreground">₹{Number(a.total_amount || a.kit?.selling_price || 0).toFixed(2)}</span>
                      {a.discount > 0 && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          Discount: -₹{a.discount.toFixed(2)}
                        </div>
                      )}
                      <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${
                        isUnpaid 
                          ? 'bg-amber-500/10 text-amber-600 animate-pulse' 
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {isUnpaid ? '⚠️ Payment Pending' : '✓ Paid'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    {a.kit?.description || 'Standard training equipment pack.'}
                  </p>

                  {/* Items list detail */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-border/60">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-2.5 flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5" /> Items Included
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Standard items list not specified.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-border/40">
                            <span className="font-bold text-foreground truncate max-w-[120px]">{item.name}</span>
                            <span className="font-semibold text-muted-foreground">×{item.qty}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Issuance dates */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-[9px] font-bold uppercase text-muted-foreground">Issue Date</div>
                        <div className="font-semibold">{new Date(a.issue_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    {a.expected_return_date && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground">Return Status</div>
                          <div className="font-semibold">
                            {isActive ? `Return due: ${new Date(a.expected_return_date).toLocaleDateString()}` : 'Returned'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="px-6 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      {isActive ? 'Currently In Use' : 'Returned back to Academy'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(a)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Download Receipt
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
