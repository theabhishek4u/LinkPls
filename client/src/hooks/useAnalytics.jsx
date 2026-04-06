import { useState, useCallback } from 'react';
import api from '../services/api';

export function useAnalytics() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { overview, loading, fetchOverview };
}
