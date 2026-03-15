import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { ContractorBusinessSuite, type FinancialSummary } from '../services/contractor-business';

type Period = '3m' | '6m' | '12m';

export const useFinanceDashboard = () => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('6m');

  const loadFinancialData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await ContractorBusinessSuite.finance.getFinancialSummary(user.id);
      setFinancialData(data);
    } catch (err) {
      logger.error('Error loading financial data', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load financial data: ${message}. Pull down to retry.`);
      // Keep previous data visible if available
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    loadFinancialData();
  }, [selectedPeriod, loadFinancialData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  return {
    financialData,
    loading,
    error,
    refreshing,
    selectedPeriod,
    setSelectedPeriod,
    handleRefresh,
  };
};
