import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

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

  const handleToggleStatus = async (sportId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPatch(`/admin/sports/${sportId}`, {
        status: newStatus
      });
      setMessage({ text: result?.message || `Sport ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'} successfully`, type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!window.confirm("Warning: Permanently removing this sport will delete it from the catalog. Proceed?")) {
      return;
    }
    setMessage({ text: '', type: '' });
    try {
      const result = await adminDelete(`/admin/sports/${sportId}`);
      setMessage({ text: result?.message || 'Sport removed successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sports Catalog</h2>
        <p className="text-muted">Create and manage sports for your academy workspace.</p>
      </div>
      <form className="card" onSubmit={handleCreateSport}>
        <h3 className="mb-4 font-bold">Create Sport</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="sportName">Sport Name</label>
            <input
              id="sportName"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="baseFee">Base Fee</label>
            <input
              id="baseFee"
              type="number"
              min={0}
              step={0.01}
              className="input-field"
              value={formData.base_fee}
              onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="status">Status</label>
          <select
            id="status"
            className="input-field"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn-primary">Create Sport</button>
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
              {sports && sports.length > 0 ? (
                sports.map((sport) => (
                  <tr key={sport.sport_id || sport.id} className="border-b">
                    <td className="p-3 font-medium">{sport.name}</td>
                    <td className="p-3">${Number(sport.base_fee || sport.baseFee || 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${sport.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {sport.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className={`text-sm font-medium ${sport.status === 'ACTIVE' ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}
                        onClick={() => handleToggleStatus(sport.sport_id || sport.id, sport.status)}
                      >
                        {sport.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:text-red-900 font-medium ml-4"
                        onClick={() => handleRemoveSport(sport.sport_id || sport.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
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
    </div>
  );
}
