import { useState, useCallback } from 'react';
import api from '../services/api';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/campaigns');
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = async (campaign) => {
    const { data } = await api.post('/campaigns', campaign);
    setCampaigns((prev) => [data.campaign, ...prev]);
    return data.campaign;
  };

  const updateCampaign = async (id, updates) => {
    const { data } = await api.patch(`/campaigns/${id}`, updates);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign : c)));
    return data.campaign;
  };

  const deleteCampaign = async (id) => {
    await api.delete(`/campaigns/${id}`);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCampaign = async (id) => {
    const { data } = await api.patch(`/campaigns/${id}/toggle`);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign : c)));
    return data.campaign;
  };

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaign,
  };
}
