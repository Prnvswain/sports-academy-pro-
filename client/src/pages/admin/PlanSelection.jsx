import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPost } from '../../api/client';
import { Gift, TrendingUp, Users, User, Check, X, AlertCircle, Loader2 } from 'lucide-react';

export default function PlanSelection() {
  const navigate = useNavigate();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null); // 'free' or 'paid'
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCoaches, setSelectedCoaches] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Load subscription status from localStorage or fetch from API
    const storedStatus = localStorage.getItem('subscriptionStatus');
    if (storedStatus) {
      setSubscriptionStatus(JSON.parse(storedStatus));
      setLoading(false);
    } else {
      fetchSubscriptionStatus();
    }
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await adminGet('/admin/subscription/status');
      if (response.success) {
        setSubscriptionStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      setMessage({ text: 'Failed to load subscription status', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachesAndStudents = async () => {
    try {
      const [coachesRes, studentsRes] = await Promise.all([
        adminGet('/admin/coaches'),
        adminGet('/admin/students')
      ]);
      
      if (coachesRes.success) {
        setCoaches(coachesRes.data || []);
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch coaches and students:', error);
      setMessage({ text: 'Failed to load academy data', type: 'error' });
    }
  };

  const handleSelectFreePlan = () => {
    setSelectedOption('free');
    fetchCoachesAndStudents();
  };

  const handleSelectPaidPlan = () => {
    setSelectedOption('paid');
    navigate('/admin/subscription');
  };

  const handleCoachToggle = (coachId) => {
    if (selectedCoaches.includes(coachId)) {
      setSelectedCoaches(prev => prev.filter(id => id !== coachId));
    } else if (selectedCoaches.length < 3) {
      setSelectedCoaches(prev => [...prev, coachId]);
    }
  };

  const handleStudentToggle = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    } else if (selectedStudents.length < 10) {
      setSelectedStudents(prev => [...prev, studentId]);
    }
  };

  const handleConfirmFreePlan = async () => {
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await adminPost('/admin/subscription/select-free', {
        selectedCoaches,
        selectedStudents
      });
      
      if (response.success) {
        localStorage.removeItem('subscriptionStatus');
        setMessage({ text: 'Successfully moved to Free Plan! Redirecting...', type: 'success' });
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 2000);
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to select Free Plan', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirmFreePlan = () => {
    const totalCoaches = coaches.length;
    const totalStudents = students.length;
    
    // If within limits, no selection needed
    if (totalCoaches <= 3 && totalStudents <= 10) {
      return true;
    }
    
    // If over limits, must select exactly the limit
    if (totalCoaches > 3 && selectedCoaches.length !== 3) {
      return false;
    }
    if (totalStudents > 10 && selectedStudents.length !== 10) {
      return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  const totalCoaches = coaches.length;
  const totalStudents = students.length;
  const needsSelection = totalCoaches > 3 || totalStudents > 10;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-lg shadow-amber-500/30">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            Your Subscription Has Expired
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your paid subscription has expired. Choose how you want to continue.
          </p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {!selectedOption ? (
          /* Plan Selection Options */
          <div className="space-y-4">
            {/* Free Plan Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectFreePlan}
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-left hover:border-lime-500 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
                    🆓 Move to Free Plan
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Continue using basic academy features.
                  </p>
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-500">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Up to 3 Coaches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Up to 10 Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Basic academy functionality</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Paid Plan Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectPaidPlan}
              className="w-full bg-gradient-to-r from-lime-500 to-emerald-600 border-2 border-transparent rounded-2xl p-6 text-left hover:from-lime-400 hover:to-emerald-500 transition-all shadow-lg shadow-lime-500/20"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-white mb-1">
                    ⭐ Upgrade to Paid Plan
                  </h3>
                  <p className="text-sm text-white/80 mb-3">
                    Continue with higher limits and premium features.
                  </p>
                  <div className="space-y-1 text-xs text-white/70">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>Higher coach & student limits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>Advanced analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>Priority support</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          </div>
        ) : selectedOption === 'free' ? (
          /* Free Plan Selection UI */
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Move to Free Plan
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {needsSelection 
                    ? 'Select which coaches and students to keep active'
                    : 'Your academy is within Free Plan limits'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOption(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {!needsSelection ? (
              /* Within limits - show summary */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Your academy has {totalCoaches} coaches and {totalStudents} students, which is within the Free Plan limits.
                  </p>
                </div>
                <button
                  onClick={handleConfirmFreePlan}
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Continue with Free Plan'
                  )}
                </button>
              </div>
            ) : (
              /* Needs selection */
              <div className="space-y-6">
                {/* Coach Selection */}
                {totalCoaches > 3 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Coaches
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedCoaches.length} / 3 selected
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {coaches.map(coach => (
                        <label
                          key={coach.coach_id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedCoaches.includes(coach.coach_id)
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-emerald-500/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCoaches.includes(coach.coach_id)}
                            onChange={() => handleCoachToggle(coach.coach_id)}
                            disabled={!selectedCoaches.includes(coach.coach_id) && selectedCoaches.length >= 3}
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{coach.name}</p>
                            <p className="text-xs text-slate-500">{coach.sport?.name || 'No sport assigned'}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Selection */}
                {totalStudents > 10 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Students
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedStudents.length} / 10 selected
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {students.map(student => (
                        <label
                          key={student.student_id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedStudents.includes(student.student_id)
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-emerald-500/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.student_id)}
                            onChange={() => handleStudentToggle(student.student_id)}
                            disabled={!selectedStudents.includes(student.student_id) && selectedStudents.length >= 10}
                            className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.sport?.name || 'No sport assigned'}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmFreePlan}
                  disabled={!canConfirmFreePlan() || submitting}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Continue with Free Plan'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
