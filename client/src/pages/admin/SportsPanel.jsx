import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';

export default function SportsPanel() {
  const [sports, setSports] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    base_fee: '',
    status: 'ACTIVE',
    icon: '🏸',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editingFeeValue, setEditingFeeValue] = useState('');

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
        status: formData.status,
        icon: formData.icon,
      });
      setMessage({ text: result.message, type: 'success' });
      setFormData({ name: '', base_fee: '', status: 'ACTIVE', icon: '🏸' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleMarkActive = async (sportId) => {
    try {
      // Update local state immediately for real-time feedback
      setSports((prevSports) =>
        prevSports.map((s) => ((s.sport_id || s.id) === sportId ? { ...s, status: 'ACTIVE' } : s)),
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'ACTIVE',
        cascade: true,
      });
      setMessage({
        text: result?.message || 'Sport marked as active successfully',
        type: 'success',
      });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  const handleDeactivate = async (sportId) => {
    try {
      // Update local state immediately for real-time feedback
      setSports((prevSports) =>
        prevSports.map((s) =>
          (s.sport_id || s.id) === sportId ? { ...s, status: 'INACTIVE' } : s,
        ),
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'INACTIVE',
        cascade: true,
      });
      setMessage({ text: result?.message || 'Sport deactivated successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (
      !window.confirm(
        'Warning: Permanently removing this sport will delete it from the catalog. Proceed?',
      )
    ) {
      return;
    }
    setMessage({ text: '', type: '' });
    try {
      // Update local state immediately for real-time feedback
      setSports((prevSports) => prevSports.filter((s) => (s.sport_id || s.id) !== sportId));
      const result = await adminDelete(`/admin/sports/${sportId}`);
      setMessage({ text: result?.message || 'Sport removed successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports(); // Revert on error
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(sports.map((s) => s.sport_id || s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode((prev) => !prev);
    setSelectedIds([]); // Clear selections when toggling
  };

  const handleSelectOne = (sportId, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, sportId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== sportId));
    }
  };

  const handleRowClick = (sportId) => {
    if (!isBulkEditMode) return;
    setSelectedIds((prev) => {
      if (prev.includes(sportId)) {
        return prev.filter((id) => id !== sportId);
      } else {
        return [...prev, sportId];
      }
    });
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    setMessage({ text: '', type: '' });
    try {
      await adminPost('/admin/sports/bulk-action', {
        action: 'activate',
        sport_ids: selectedIds,
      });
      setMessage({ text: 'Sports activated successfully', type: 'success' });
      setSelectedIds([]);
      setIsBulkEditMode(false);
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    setMessage({ text: '', type: '' });
    try {
      await adminPost('/admin/sports/bulk-action', {
        action: 'deactivate',
        sport_ids: selectedIds,
      });
      setMessage({ text: 'Sports deactivated successfully', type: 'success' });
      setSelectedIds([]);
      setIsBulkEditMode(false);
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Warning: Permanently removing ${selectedIds.length} sports will delete them from the catalog. Proceed?`,
      )
    ) {
      return;
    }
    setMessage({ text: '', type: '' });
    try {
      await adminPost('/admin/sports/bulk-action', {
        action: 'delete',
        sport_ids: selectedIds,
      });
      setMessage({ text: 'Sports removed successfully', type: 'success' });
      setSelectedIds([]);
      setIsBulkEditMode(false);
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleStartEditFee = (sportId, currentFee) => {
    setEditingFeeId(sportId);
    setEditingFeeValue(currentFee?.toString() || '0');
  };

  const handleCancelEditFee = () => {
    setEditingFeeId(null);
    setEditingFeeValue('');
  };

  const handleSaveFee = async (sportId) => {
    setMessage({ text: '', type: '' });
    try {
      const newFee = parseFloat(editingFeeValue);
      if (isNaN(newFee) || newFee < 0) {
        setMessage({ text: 'Please enter a valid fee amount', type: 'error' });
        return;
      }
      await adminPatch(`/admin/sports/${sportId}`, { base_fee: newFee });
      setMessage({ text: 'Base fee updated successfully', type: 'success' });
      setEditingFeeId(null);
      setEditingFeeValue('');
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    <motion.div
      className="space-y-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Sports Catalog</h2>
        <p className="text-muted">Create and manage sports for your academy workspace.</p>
      </div>
      <form className="card" onSubmit={handleCreateSport}>
        <h3 className="mb-4 font-bold">Add Sport</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="sportName">
              Sport Name
            </label>
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
            <label className="label" htmlFor="sportIcon">
              Sport Icon
            </label>
            <motion.select
              id="sportIcon"
              className="input-field"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              whileFocus={{ scale: 1.01 }}
            >
              <option value="🏸">🏸 Badminton</option>
              <option value="🏏">🏏 Cricket</option>
              <option value="⚽">⚽ Football</option>
              <option value="🏀">🏀 Basketball</option>
              <option value="🎾">🎾 Tennis</option>
              <option value="🏊">🏊 Swimming</option>
              <option value="🏋️">🏋️ Weightlifting</option>
              <option value="🥊">🥊 Boxing</option>
              <option value="🏐">🏐 Volleyball</option>
              <option value="🎱">🎱 Pool</option>
              <option value="⛳">⛳ Golf</option>
              <option value="🎿">🎿 Skiing</option>
              <option value="🛹">🛹 Skateboarding</option>
              <option value="🚴">🚴 Cycling</option>
              <option value="🏃">🏃 Running</option>
            </motion.select>
          </div>
          <div>
            <label className="label" htmlFor="baseFee">
              Base Fee
            </label>
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
          <label className="label" htmlFor="status">
            Status
          </label>
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
            Add Sport
          </motion.button>
        </div>
      </form>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </p>
      )}
      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold">Available Sports</h3>
            <button
              type="button"
              className={`btn-sm ${isBulkEditMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleBulkEditMode}
            >
              {isBulkEditMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
            </button>
          </div>
          {isBulkEditMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <button type="button" className="btn-secondary btn-sm" onClick={handleBulkActivate}>
                Bulk Activate ({selectedIds.length})
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={handleBulkDeactivate}>
                Bulk Deactivate ({selectedIds.length})
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={handleBulkDelete}>
                Bulk Delete ({selectedIds.length})
              </button>
            </motion.div>
          )}
        </div>
        {loading ? (
          <Loader message="Loading sports catalog…" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {isBulkEditMode && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === sports.length && sports.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="border-border accent-accent h-4 w-4 rounded"
                    />
                  </th>
                )}
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
                    className={`cursor-pointer border-b ${selectedIds.includes(sport.sport_id || sport.id) ? 'bg-surface-secondary/50' : ''}`}
                    onClick={() => handleRowClick(sport.sport_id || sport.id)}
                  >
                    {isBulkEditMode && (
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sport.sport_id || sport.id)}
                          onChange={(e) =>
                            handleSelectOne(sport.sport_id || sport.id, e.target.checked)
                          }
                          className="border-border accent-accent h-4 w-4 rounded"
                        />
                      </td>
                    )}
                    <td className="p-3 font-medium">
                      <span className="mr-2 text-lg">{sport.icon || '🏸'}</span>
                      {sport.name}
                    </td>
                    <td className="p-3">
                      {editingFeeId === (sport.sport_id || sport.id) ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="input-field w-24 px-2 py-1 text-sm"
                            value={editingFeeValue}
                            onChange={(e) => setEditingFeeValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveFee(sport.sport_id || sport.id);
                              if (e.key === 'Escape') handleCancelEditFee();
                            }}
                          />
                          <button
                            type="button"
                            className="btn-success btn-sm px-2 py-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveFee(sport.sport_id || sport.id);
                            }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm px-2 py-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditFee();
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span>${formatCurrency(sport.base_fee || sport.baseFee)}</span>
                          <button
                            type="button"
                            className="text-muted hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditFee(sport.sport_id || sport.id, sport.base_fee || sport.baseFee);
                            }}
                            title="Edit Fee"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          sport.status === 'ACTIVE'
                            ? 'bg-success/10 text-success border-success/20 border'
                            : 'bg-danger/10 text-danger border-danger/20 border'
                        }`}
                      >
                        {sport.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="space-x-1 p-3" onClick={(e) => e.stopPropagation()}>
                      {sport.status === 'ACTIVE' ? (
                        <>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handleDeactivate(sport.sport_id || sport.id)}
                          >
                            Deactivate
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => handleRemoveSport(sport.sport_id || sport.id)}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handleMarkActive(sport.sport_id || sport.id)}
                          >
                            Mark Active
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => handleRemoveSport(sport.sport_id || sport.id)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isBulkEditMode ? 5 : 4}
                    className="text-muted-foreground py-8 text-center"
                  >
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
