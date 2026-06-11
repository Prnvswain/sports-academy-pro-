import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminGet, adminPost, TIMING_OPTIONS } from '../../api/client';

const emptyBatchForm = {
  name: '',
  timing: TIMING_OPTIONS[4],
  coach_id: '',
  sport_id: '',
  max_capacity: ''
};

export default function BatchesPanel() {
  const [batches, setBatches] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [sports, setSports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, coachesRes, sportsRes] = await Promise.all([
        adminGet('/admin/batches'),
        adminGet('/admin/coaches'),
        adminGet('/admin/sports')
      ]);
      setBatches(batchesRes?.data || []);
      setCoaches(coachesRes?.data || []);
      const sportsData = sportsRes?.data?.data || sportsRes?.data || [];
      setSports(Array.isArray(sportsData) ? sportsData : []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
      setCoaches([]);
      setSports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatchChange = (event) => {
    const { name, value } = event.target;
    setBatchForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBatchSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/batches', {
        name: batchForm.name?.trim(),
        timing: batchForm.timing,
        coach_id: parseInt(batchForm.coach_id, 10),
        sport_id: parseInt(batchForm.sport_id, 10),
        max_capacity: batchForm.max_capacity ? parseInt(batchForm.max_capacity, 10) : undefined
      });
      setMessage({ text: result?.message || 'Batch created successfully', type: 'success' });
      setBatchForm(emptyBatchForm);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const filteredBatches = (batches || []).filter(batch =>
    batch?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch?.sport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch?.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Training Batches</h2>
        <p className="text-muted">Schedule and manage training batches with coaches and sports.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* FIXED FORM: Replaced 'bg-white border p-6 rounded-xl' with global 'card' utility */}
        <form className="card space-y-4" onSubmit={handleBatchSubmit}>
          <h3 className="font-bold text-lg">Create Batch</h3>
          <div>
            <label className="label" htmlFor="batchName">Batch Name</label>
            {/* FIXED INPUT: Replaced explicitly broken inner utility classes with generic clean 'input-field' */}
            <input id="batchName" name="name" className="input-field" value={batchForm.name} onChange={handleBatchChange} required />
          </div>
          <div>
            <label className="label" htmlFor="batchTiming">Timing</label>
            <select id="batchTiming" name="timing" className="input-field bg-[var(--color-input)] text-foreground" value={batchForm.timing} onChange={handleBatchChange} required>
              {TIMING_OPTIONS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="batchCoach">Coach</label>
            <select id="batchCoach" name="coach_id" className="input-field bg-[var(--color-input)] text-foreground" value={batchForm.coach_id} onChange={handleBatchChange} required>
              <option value="" className="text-muted">Select coach…</option>
              {coaches.map((c) => (
                <option key={c?.coach_id} value={c?.coach_id}>{c?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="batchSport">Sport</label>
            <select id="batchSport" name="sport_id" className="input-field bg-[var(--color-input)] text-foreground" value={batchForm.sport_id} onChange={handleBatchChange} required>
              <option value="" className="text-muted">Select sport…</option>
              {sports.map((s) => (
                <option key={s?.sport_id} value={s?.sport_id}>{s?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="batchCapacity">Max Capacity (optional)</label>
            <input
              id="batchCapacity"
              name="max_capacity"
              type="number"
              min={1}
              className="input-field"
              value={batchForm.max_capacity}
              onChange={handleBatchChange}
              placeholder="e.g. 20"
            />
          </div>
          {/* FIXED BUTTON: Replaced static 'bg-blue-600' with your global green/emerald setup 'btn-primary' */}
          <button type="submit" className="btn-primary w-full cursor-pointer">Create Batch</button>
        </form>

        {/* FIXED LIST CONTAINER: Removed hardcoded background utilities */}
        <div className="card space-y-4 overflow-x-auto">
          <h3 className="font-bold text-lg">Scheduled Batches</h3>
          <div>
            <input
              type="text"
              className="input-field"
              placeholder="Search batches by name, sport, or coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <Loader />
          ) : (
            /* FIXED TABLE: Leveraged theme-aware text-muted and internal token borders */
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3 px-2">Timing</th>
                  <th className="pb-3 px-2">Coach</th>
                  <th className="pb-3 px-2">Sport</th>
                  <th className="pb-3 px-2">Capacity</th>
                  <th className="pb-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted text-xs">
                      {searchQuery ? 'No batches match your search.' : 'No batches scheduled.'}
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr key={batch?.batch_id} className="text-foreground">
                      <td className="py-3 font-semibold">{batch?.name}</td>
                      <td className="py-3 px-2 text-muted">{batch?.timing || '—'}</td>
                      <td className="py-3 px-2">{batch?.coach?.name || '—'}</td>
                      <td className="py-3 px-2">{batch?.sport?.name || '—'}</td>
                      <td className="py-3 px-2 font-medium">
                        {batch?.enrolled_count ?? batch?.students?.length ?? 0}
                        {batch?.max_capacity != null ? ` / ${batch.max_capacity}` : ''}
                      </td>
                      <td className="py-3 px-2">
                        {/* Dynamic green status badges using customized color tokens */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${batch?.status === 'ACTIVE' || !batch?.status ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                          {batch?.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FIXED SEMANTIC ALERTS: Replaced static styles with standard design framework variants */}
      {message?.text && (
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </div>
      )}
    </div>
  );
}