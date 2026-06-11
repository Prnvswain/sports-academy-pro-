import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCoachToken, coachGet } from '../api/client';

const CoachBatchesContext = createContext(null);

export function CoachBatchesProvider({ children }) {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchRes, dashRes] = await Promise.all([
        coachGet('/coach/batches'),
        coachGet('/coach/dashboard')
      ]);
      const batchPayload = batchRes.data || {};
      setBatches(batchPayload.batches || batchPayload || []);
      setDashboard(dashRes.data || null);
    } catch (err) {
      setError(err.message);
      if (err.status === 401) {
        clearCoachToken();
        navigate('/coach/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const allStudents = useMemo(
    () => batches.flatMap((b) => b.students || []),
    [batches]
  );

  const value = useMemo(
    () => ({
      batches,
      dashboard,
      allStudents,
      loading,
      error,
      reload: load
    }),
    [batches, dashboard, allStudents, loading, error, load]
  );

  return (
    <CoachBatchesContext.Provider value={value}>{children}</CoachBatchesContext.Provider>
  );
}

export function useCoachBatches() {
  const ctx = useContext(CoachBatchesContext);
  if (!ctx) {
    throw new Error('useCoachBatches must be used within CoachBatchesProvider');
  }
  return ctx;
}
