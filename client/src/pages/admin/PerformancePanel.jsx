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
  Cycling: '🚴'
};

export default function PerformancePanel() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [formData, setFormData] = useState({
    sport_id: '',
    name: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadSports = useCallback(async () => {
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        setSports(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setSports(responseData.data);
      } else if (responseData && Array.isArray(responseData.academy_sports)) {
        setSports(responseData.academy_sports);
      } else if (responseData && Array.isArray(responseData.sports)) {
        setSports(responseData.sports);
      } else {
        setSports([]);
      }
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
      const result = await adminGet(`/admin/performance/attributes?sport_id=${sportId}&status=APPROVED`);
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
        name: formData.name.trim()
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
        action: 'APPROVED'
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
        action: 'REJECTED'
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

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.div 
      className="space-y-6 p-6 bg-surface min-h-screen text-foreground"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-500">
          Performance Tracker
        </h2>
        <p className="text-sm text-muted mt-1">Manage core sports criteria profiles and validate coach-submitted metrics.</p>
      </div>

      {message.text && (
        <div className={`alert-${message.type === 'success' ? 'success' : 'error'} border border-current/10 p-4 rounded-xl text-sm font-semibold`}>
          {message.text}
        </div>
      )}

      {/* Sports Selection Grid Container */}
      <div className="space-y-4">
        <h3 className="font-black text-lg tracking-tight">Active Sports Catalog</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sports.map((sport, index) => {
            // Cleans up naming variants (e.g. "Table Tennis" -> "TableTennis") to match keys perfectly
            const cleanKey = sport.name.replace(/\s+/g, '');
            // Dynamic check: returns explicit emoji if matched, or falls back onto Multi-sport Trophy
            const icon = SPORT_ICONS[cleanKey] || SPORT_ICONS[sport.name] || '🏆';
            const isSelected = selectedSport?.sport_id === sport.sport_id;

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
                className={`card p-5 text-left transition-all duration-300 hover:border-accent/40 relative group overflow-hidden ${
                  isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-surface-secondary'
                }`}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 inline-block">{icon}</div>
                <div className="font-black text-base text-foreground tracking-tight">{sport.name}</div>
                <div className="text-xs text-muted mt-1.5 font-medium">
                  Click to administer attributes
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {selectedSport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-[premiumFadeIn_0.2s_ease-out]">
          
          {/* Attributes List Display Grid */}
          <div className="card bg-surface-secondary border border-border p-6 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-black text-lg tracking-tight text-foreground border-b border-border pb-3">
              {selectedSport.name} &mdash; Core Evaluation Parameters
            </h3>

            {attributes.length > 0 ? (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {attributes.map((attr) => (
                  <div key={attr.attribute_id} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border/70 hover:border-accent/20 transition-colors shadow-inner">
                    <div>
                      <div className="font-bold text-foreground text-sm tracking-tight">{attr.name}</div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-accent mt-0.5">
                        Status: {attr.status}
                      </div>
                    </div>
                    {attr.requested_by && (
                      <div className="text-xs font-semibold text-muted bg-surface-secondary px-3 py-1.5 rounded-lg border border-border/40">
                        Proposed by: <span className="text-foreground font-bold">{attr.requested_by.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm font-medium py-6 text-center border border-dashed border-border rounded-xl bg-surface/30">
                No verified attributes defined for this discipline yet.
              </p>
            )}
          </div>

          {/* Direct Input Custom Form Box Element */}
          <div className="card bg-surface-secondary border border-border p-6 shadow-sm space-y-4">
            <h3 className="font-black text-lg tracking-tight text-foreground border-b border-border pb-3">
              Add Attribute Entry
            </h3>
            
            <form className="space-y-4" onSubmit={handleCreateAttribute}>
              <div>
                <label className="label text-xs font-black tracking-wide uppercase text-muted mb-1.5" htmlFor="attributeName">
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
              <button type="submit" className="w-full bg-accent text-white hover:bg-accent-hover py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-transform active:scale-95 shadow-md shadow-accent/10">
                Append Parameter
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Coach Validation Moderation Queue Interface Section */}
      <div className="card bg-surface-secondary border border-border p-6 shadow-sm">
        <h3 className="font-black text-lg tracking-tight border-b border-border pb-3 mb-4 flex items-center gap-2">
          <span>📋</span> Coach Metrics Approval Queue
        </h3>
        
        {approvalQueue.length > 0 ? (
          <div className="space-y-3">
            {approvalQueue.map((attr) => (
              <div key={attr.attribute_id} className="p-4 bg-surface rounded-xl border border-border/80 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-bold text-foreground text-base tracking-tight">{attr.name}</div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-muted mt-1.5">
                    <span>Sport: <strong className="text-accent font-black">{attr.sport?.name || 'Unspecified'}</strong></span>
                    {attr.requested_by && (
                      <span className="border-l border-border pl-4">
                        Proposed by Coach: <strong className="text-foreground font-black">{attr.requested_by.name}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleApproveAttribute(attr.attribute_id)}
                    className="bg-accent text-white hover:bg-accent-hover px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase shadow-sm transition-transform active:scale-95"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectAttribute(attr.attribute_id)}
                    className="btn-secondary border border-border/80 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase hover:text-danger hover:border-danger/20 transition-all active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm font-medium py-10 text-center border border-dashed border-border rounded-xl bg-surface/30 m-0">
            No pending custom requests currently caught in validation loops.
          </p>
        )}
      </div>
    </motion.div>
  );
}