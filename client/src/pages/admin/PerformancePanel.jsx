import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch } from '../../api/client';

// Expanded Sports Icon Matrix Map with automatic fallback layout compatibility
const SPORT_ICONS = {
  Cricket: '🏏',
  Football: '⚽',
  Basketball: '🏀',
  Tennis: '🎾',
  Badminton: '🏸',
  Swimming: '🏊',
  Volleyball: '🏐',
  Rugby: '🏉',
  Hockey: '🏑',
  TableTennis: '🏓',
  PingPong: '🏓',
  Squash: '🏓',
  Baseball: ' baseball',
  Softball: '🥎',
  Golf: '🏌️‍♂️',
  Boxing: '🥊',
  Karate: '🥋',
  Taekwondo: '🥋',
  Judo: '🥋',
  Gymnastics: '🤸',
  Athletics: '🏃‍♂️',
  Running: '🏃‍♂️',
  Archery: '🏹',
  Shooting: '🎯',
  Skating: '🛼',
  Cycling: '🚴',
};

export default function PerformancePanel() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [formData, setFormData] = useState({
    sport_id: '',
    name: '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadSports = useCallback(async () => {
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      let sportsArray = [];
      if (Array.isArray(responseData)) {
        sportsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        sportsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.academy_sports)) {
        sportsArray = responseData.academy_sports;
      } else if (responseData && Array.isArray(responseData.sports)) {
        sportsArray = responseData.sports;
      }
      setSports(sportsArray.filter(s => s.status === 'ACTIVE'));
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setSports([]);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    if (!sportId) {
      setAttributes([]);
      return;
    }
    try {
      const result = await adminGet(
        `/admin/performance/attributes?sport_id=${sportId}&status=APPROVED`,
      );
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        setAttributes(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setAttributes(responseData.data);
      } else {
        setAttributes([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setAttributes([]);
    }
  }, []);

  const loadApprovalQueue = useCallback(async () => {
    try {
      const result = await adminGet('/admin/performance/approval-queue');
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        setApprovalQueue(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setApprovalQueue(responseData.data);
      } else {
        setApprovalQueue([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setApprovalQueue([]);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([loadSports(), loadApprovalQueue()]);
      setLoading(false);
    };
    initialize();
  }, [loadSports, loadApprovalQueue]);

  useEffect(() => {
    if (selectedSport) {
      loadAttributes(selectedSport.sport_id);
    }
  }, [selectedSport, loadAttributes]);

  const handleCreateAttribute = async (event) => {
    event.preventDefault();
    if (!formData.sport_id || !formData.name.trim()) return;
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/performance/attributes', {
        sport_id: parseInt(formData.sport_id, 10),
        name: formData.name.trim(),
      });
      setMessage({ text: result.message || 'Attribute added successfully!', type: 'success' });
      setFormData((prev) => ({ ...prev, name: '' }));
      if (selectedSport) {
        loadAttributes(selectedSport.sport_id);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleApproveAttribute = async (attributeId) => {
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPatch(`/admin/performance/approve-attribute/${attributeId}`, {
        action: 'APPROVED',
      });
      setMessage({ text: result.message || 'Attribute approved successfully.', type: 'success' });
      loadApprovalQueue();
      if (selectedSport) {
        loadAttributes(selectedSport.sport_id);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleRejectAttribute = async (attributeId) => {
    if (!window.confirm('Are you sure you want to decline this attribute suggestion?')) {
      return;
    }
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPatch(`/admin/performance/approve-attribute/${attributeId}`, {
        action: 'REJECTED',
      });
      setMessage({ text: result.message || 'Attribute selection declined.', type: 'success' });
      loadApprovalQueue();
      if (selectedSport) {
        loadAttributes(selectedSport.sport_id);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
    setFormData({ sport_id: sport.sport_id.toString(), name: '' });
  };

  const handleBackToAllSports = () => {
    setSelectedSport(null);
    setFormData({ sport_id: '', name: '' });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.div
      className="bg-surface text-foreground min-h-screen space-y-6 p-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Performance Tracker
        </h2>
        <p className="text-muted mt-1 text-sm">
          Manage core sports criteria profiles and validate coach-submitted metrics.
        </p>
      </div>

      {message.text && (
        <div
          className={`alert-${message.type === 'success' ? 'success' : 'error'} border-current/10 rounded-xl border p-4 text-sm font-semibold`}
        >
          {message.text}
        </div>
      )}

      {!selectedSport ? (
        <>
          {/* Sports Selection Grid Container */}
          <div className="space-y-4">
            <h3 className="text-lg font-black tracking-tight">Active Sports Catalog</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sports.map((sport, index) => {
                // Cleans up naming variants (e.g. "Table Tennis" -> "TableTennis") to match keys perfectly
                const cleanKey = sport.name.replace(/\s+/g, '');
                // Dynamic check: returns explicit emoji if matched, or falls back onto Multi-sport Trophy
                const icon = SPORT_ICONS[cleanKey] || SPORT_ICONS[sport.name] || '🏆';

                return (
                  <motion.button
                    key={sport.sport_id}
                    type="button"
                    onClick={() => handleSportSelect(sport)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="card hover:border-accent/40 border-border bg-surface-secondary group relative overflow-hidden p-5 text-left transition-all duration-300"
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-1 origin-top scale-y-0 transform transition-transform duration-300 group-hover:scale-y-100 ${
                        index % 4 === 0
                          ? 'bg-blue'
                          : index % 4 === 1
                            ? 'bg-purple'
                            : index % 4 === 2
                              ? 'bg-orange'
                              : 'bg-cyan'
                      }`}
                    />
                    <div className="mb-3 inline-block text-3xl transition-transform duration-300 group-hover:scale-110">
                      {icon}
                    </div>
                    <div className="text-foreground text-base font-black tracking-tight">
                      {sport.name}
                    </div>
                    <div className="text-muted mt-1.5 text-xs font-medium">
                      Click to administer attributes
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Coach Validation Moderation Queue Interface Section */}
          <div className="card bg-surface-secondary border-border border p-6 shadow-sm">
            <h3 className="border-border mb-4 flex items-center gap-2 border-b pb-3 text-lg font-black tracking-tight">
              <span>📋</span> Coach Metrics Approval Queue
            </h3>

            {approvalQueue.length > 0 ? (
              <div className="space-y-3">
                {approvalQueue.map((attr) => (
                  <div
                    key={attr.attribute_id}
                    className="bg-surface border-border/80 flex flex-col justify-between gap-4 rounded-xl border p-4 shadow-inner sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <div className="text-foreground text-base font-bold tracking-tight">
                        {attr.name}
                      </div>
                      <div className="text-muted mt-1.5 flex items-center gap-4 text-xs font-semibold">
                        <span>
                          Sport:{' '}
                          <strong className="text-accent font-black">
                            {attr.sport?.name || 'Unspecified'}
                          </strong>
                        </span>
                        {attr.requested_by && (
                          <span className="border-border border-l pl-4">
                            Proposed by Coach:{' '}
                            <strong className="text-foreground font-black">
                              {attr.requested_by.name}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleApproveAttribute(attr.attribute_id)}
                        className="btn-gradient-primary rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition-transform active:scale-95"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectAttribute(attr.attribute_id)}
                        className="btn-gradient-orange rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide transition-transform active:scale-95"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted border-border bg-surface/30 m-0 rounded-xl border border-dashed py-10 text-center text-sm font-medium">
                No pending custom requests currently caught in validation loops.
              </p>
            )}
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBackToAllSports}
            className="text-muted hover:text-accent flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <span>←</span> Back to All Sports
          </button>

          {/* Sport Detail Header */}
          <div className="card border-accent/20 bg-accent/5 border p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {(() => {
                  const cleanKey = selectedSport.name.replace(/\s+/g, '');
                  return SPORT_ICONS[cleanKey] || SPORT_ICONS[selectedSport.name] || '🏆';
                })()}
              </div>
              <div>
                <h3 className="text-foreground text-2xl font-black tracking-tight">
                  {selectedSport.name}
                </h3>
                <p className="text-muted mt-1 text-sm">
                  Manage evaluation parameters and attributes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {/* Attributes List Display Grid */}
            <div className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm lg:col-span-2">
              <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
                Core Evaluation Parameters
              </h3>

              {attributes.length > 0 ? (
                <div className="max-h-[400px] space-y-2.5 overflow-y-auto pr-1">
                  {attributes.map((attr) => (
                    <div
                      key={attr.attribute_id}
                      className="bg-surface border-border/70 hover:border-accent/20 flex items-center justify-between rounded-xl border p-4 shadow-inner transition-colors"
                    >
                      <div>
                        <div className="text-foreground text-sm font-bold tracking-tight">
                          {attr.name}
                        </div>
                        <div className="text-accent mt-0.5 text-[10px] font-black uppercase tracking-widest">
                          Status: {attr.status}
                        </div>
                      </div>
                      {attr.requested_by && (
                        <div className="text-muted bg-surface-secondary border-border/40 rounded-lg border px-3 py-1.5 text-xs font-semibold">
                          Proposed by:{' '}
                          <span className="text-foreground font-bold">
                            {attr.requested_by.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted border-border bg-surface/30 rounded-xl border border-dashed py-6 text-center text-sm font-medium">
                  No verified attributes defined for this discipline yet.
                </p>
              )}
            </div>

            {/* Direct Input Custom Form Box Element */}
            <div className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm">
              <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
                Add Attribute Entry
              </h3>

              <form className="space-y-4" onSubmit={handleCreateAttribute}>
                <div>
                  <label
                    className="label text-muted mb-1.5 text-xs font-black uppercase tracking-wide"
                    htmlFor="attributeName"
                  >
                    Attribute Title Name
                  </label>
                  <input
                    id="attributeName"
                    type="text"
                    className="input-field py-3 text-sm"
                    placeholder="e.g., Stamina, Agility, Accuracy..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-gradient-primary w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider shadow-md transition-transform active:scale-95"
                >
                  Append Parameter
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
