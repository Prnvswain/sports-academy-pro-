import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminPost, adminGet } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import ModalWrapper from './ModalWrapper';

export default function BroadcastModal({ isOpen, onClose, batches }) {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'ALL_COACHES',
    batch_id: '',
    selected_coach_ids: [],
    selected_student_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [coachSearchTerm, setCoachSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const response = await adminGet('/admin/coaches');
        setCoaches(response.data?.data || response.data || []);
      } catch (error) {
        console.error('Failed to fetch coaches:', error);
      }
    };
    const fetchStudents = async () => {
      try {
        const response = await adminGet('/admin/students');
        setStudents(response.data?.data || response.data || []);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };
    fetchCoaches();
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const result = await adminPost('/admin/announcements', formData);
      setMessage({ text: result.message || 'Announcement sent successfully!', type: 'success' });
      setFormData({
        title: '',
        message: '',
        target_type: 'ALL_COACHES',
        batch_id: '',
        selected_coach_ids: [],
        selected_student_ids: [],
      });
      setTimeout(() => {
        onClose();
        setMessage({ text: '', type: '' });
      }, 2000);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to send announcement', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCoachSelection = (coachId) => {
    setFormData((prev) => ({
      ...prev,
      selected_coach_ids: prev.selected_coach_ids.includes(coachId)
        ? prev.selected_coach_ids.filter((id) => id !== coachId)
        : [...prev.selected_coach_ids, coachId],
    }));
  };

  const toggleStudentSelection = (studentId) => {
    setFormData((prev) => ({
      ...prev,
      selected_student_ids: prev.selected_student_ids.includes(studentId)
        ? prev.selected_student_ids.filter((id) => id !== studentId)
        : [...prev.selected_student_ids, studentId],
    }));
  };

  const filteredCoaches = coaches?.filter((coach) =>
    coach?.name?.toLowerCase().includes(coachSearchTerm.toLowerCase())
  ) || [];

  const filteredStudents = students?.filter((student) =>
    student?.name?.toLowerCase().includes(studentSearchTerm.toLowerCase())
  ) || [];

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="broadcast-modal"
      contentClassName={`w-full max-w-2xl rounded-xl shadow-2xl transition-colors duration-200 ${
        isDark ? 'bg-[#151824] border-slate-700/50' : 'bg-white border-slate-200'
      } border p-6 max-h-[90vh] overflow-y-auto`}
    >
            <div className="mb-6 flex items-center justify-between">
              <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Smart Broadcast Center
              </h2>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg p-2 transition-colors duration-200 ${
                  isDark
                    ? 'hover:bg-slate-700/30 text-slate-400 hover:text-slate-200'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {message.text && (
              <div
                className={`mb-4 rounded-lg p-3 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                } border`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target Audience
                </label>
                <select
                  name="target_type"
                  value={formData.target_type}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 ${
                    isDark
                      ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                  }`}
                  required
                >
                  <option value="ALL_COACHES">All Coaches</option>
                  <option value="SPECIFIC_COACHES">Specific Coaches</option>
                  <option value="BATCH_COACHES">Specific Batch Coaches</option>
                  <option value="PARENTS_ALL">All Parents</option>
                  <option value="PARENTS_DUE">Parents with Due Payments</option>
                  <option value="SPECIFIC_PARENTS">Specific Parents</option>
                </select>
              </div>

              {formData.target_type === 'BATCH_COACHES' && (
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Select Batch
                  </label>
                  <select
                    name="batch_id"
                    value={formData.batch_id}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 ${
                      isDark
                        ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                    }`}
                    required
                  >
                    <option value="">Select a batch...</option>
                    {batches?.map((batch) => (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target_type === 'SPECIFIC_COACHES' && (
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Select Coaches
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search coaches..."
                      value={coachSearchTerm}
                      onChange={(e) => setCoachSearchTerm(e.target.value)}
                      onFocus={() => setShowCoachDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCoachDropdown(false), 250)}
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 ${
                        isDark
                          ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                      }`}
                    />
                    {showCoachDropdown && coachSearchTerm && (
                      <div
                        className={`absolute z-[1000] w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
                          isDark ? 'bg-[#151824] border-slate-700/50' : 'bg-white border-slate-200'
                        }`}
                      >
                        {filteredCoaches.map((coach) => (
                          <div
                            key={coach.coach_id}
                            className={`cursor-pointer px-4 py-2 text-sm transition-colors duration-150 ${
                              isDark
                                ? 'hover:bg-slate-700/30 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            onMouseDown={() => {
                              toggleCoachSelection(coach.coach_id);
                              setCoachSearchTerm('');
                            }}
                          >
                            {coach.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.selected_coach_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.selected_coach_ids.map((coachId) => {
                        const coach = coaches.find((c) => c.coach_id === coachId);
                        return (
                          <span
                            key={coachId}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                              isDark
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            } border`}
                          >
                            {coach?.name}
                            <button
                              type="button"
                              onClick={() => toggleCoachSelection(coachId)}
                              className="ml-1 hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {formData.target_type === 'SPECIFIC_PARENTS' && (
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Select Students (Parents)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      onFocus={() => setShowStudentDropdown(true)}
                      onBlur={() => setTimeout(() => setShowStudentDropdown(false), 250)}
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 ${
                        isDark
                          ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                      }`}
                    />
                    {showStudentDropdown && studentSearchTerm && (
                      <div
                        className={`absolute z-[1000] w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
                          isDark ? 'bg-[#151824] border-slate-700/50' : 'bg-white border-slate-200'
                        }`}
                      >
                        {filteredStudents.map((student) => (
                          <div
                            key={student.student_id}
                            className={`cursor-pointer px-4 py-2 text-sm transition-colors duration-150 ${
                              isDark
                                ? 'hover:bg-slate-700/30 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            onMouseDown={() => {
                              toggleStudentSelection(student.student_id);
                              setStudentSearchTerm('');
                            }}
                          >
                            {student.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.selected_student_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.selected_student_ids.map((studentId) => {
                        const student = students.find((s) => s.student_id === studentId);
                        return (
                          <span
                            key={studentId}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                              isDark
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            } border`}
                          >
                            {student?.name}
                            <button
                              type="button"
                              onClick={() => toggleStudentSelection(studentId)}
                              className="ml-1 hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Announcement Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter announcement title..."
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 ${
                    isDark
                      ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Enter your announcement message..."
                  rows={4}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors duration-200 resize-none ${
                    isDark
                      ? 'bg-[#0F111A] border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    loading
                      ? 'bg-emerald-500/50 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  } text-white`}
                >
                  {loading ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
    </ModalWrapper>
  );
}
