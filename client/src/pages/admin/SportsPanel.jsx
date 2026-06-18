import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

const formatCurrency = (value) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(2)
    : '0.00';

export default function SportsPanel() {
  const [sports, setSports] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    base_fee: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadSports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      console.log('DEBUG: Sports API Array ->', responseData);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSports();
  }, [loadSports]);

  const handleCreateSport = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/sports', {
        name: formData.name.trim(),
        base_fee: parseFloat(formData.base_fee || 0),
        status: formData.status
      });
      setMessage({ text: result.message, type: 'success' });
      setFormData({ name: '', base_fee: '', status: 'ACTIVE' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleMarkActive = async (sportId) => {
    try {
      // Update local state immediately for real-time feedback
      setSports(prevSports => 
        prevSports.map(s => 
          (s.sport_id || s.id) === sportId ? { ...s, status: 'ACTIVE' } : s
        )
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'ACTIVE'
      });
      setMessage({ text: result?.message || 'Sport marked as active successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  const handleDeactivate = async (sportId) => {
    try {
      // Update local state immediately for real-time feedback
      setSports(prevSports => 
        prevSports.map(s => 
          (s.sport_id || s.id) === sportId ? { ...s, status: 'INACTIVE' } : s
        )
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'INACTIVE'
      });
      setMessage({ text: result?.message || 'Sport deactivated successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!window.confirm("Warning: Permanently removing this sport will delete it from the catalog. Proceed?")) {
      return;
    }
    setMessage({ text: '', type: '' });
    try {
      // Update local state immediately for real-time feedback
      setSports(prevSports => 
        prevSports.filter(s => (s.sport_id || s.id) !== sportId)
      );
      const result = await adminDelete(`/admin/sports/${sportId}`);
      setMessage({ text: result?.message || 'Sport removed successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Sports Catalog</h2>
        <p className="text-muted">Create and manage sports for your academy workspace.</p>
      </div>
      <form className="card" onSubmit={handleCreateSport}>
        <h3 className="mb-4 font-bold">Create Sport</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="sportName">Sport Name</label>
            <motion.input
              id="sportName"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              whileFocus={{ scale: 1.01 }}
            />
          </div>
          <div>
            <label className="label" htmlFor="baseFee">Base Fee</label>
            <motion.input
              id="baseFee"
              type="number"
              min={0}
              step={0.01}
              className="input-field"
              value={formData.base_fee}
              onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
              placeholder="0.00"
              whileFocus={{ scale: 1.01 }}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="status">Status</label>
          <motion.select
            id="status"
            className="input-field"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            whileFocus={{ scale: 1.01 }}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </motion.select>
        </div>
        <div className="mt-4">
          <motion.button 
            type="submit" 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Create Sport
          </motion.button>
        </div>
      </form>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
      <div className="card overflow-x-auto">
        <h3 className="mb-4 font-bold">Available Sports</h3>
        {loading ? (
          <Loader message="Loading sports catalog…" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Base Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sports || []).length > 0 ? (
                (sports || []).map((sport, index) => (
                  <motion.tr
                    key={sport.sport_id || sport.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    className="border-b"
                  >
                    <td className="p-3 font-medium">{sport.name}</td>
                    <td className="p-3">${formatCurrency(sport.base_fee || sport.baseFee)}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        sport.status === 'ACTIVE' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
                      }`}>
                        {sport.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 space-x-1">
                      {sport.status === 'ACTIVE' ? (
                        <>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => handleDeactivate(sport.sport_id || sport.id)}>
                            Deactivate
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => handleRemoveSport(sport.sport_id || sport.id)}>
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkActive(sport.sport_id || sport.id)}>
                            Mark Active
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => handleRemoveSport(sport.sport_id || sport.id)}>
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No sports available. Create a sport above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
