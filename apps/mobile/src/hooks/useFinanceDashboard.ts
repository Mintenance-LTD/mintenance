import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { logger } from '../services/logger';
import { useAuth } from '../contexts/AuthContext';
import { contractorBusinessSuite, type FinancialSummary } from '../services/contractor-business';

type Period = '3m' | '6m' | '12m';

export const useFinanceDashboard = () => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('6m');

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    if (!user) return;

    try {
      const data = await contractorBusinessSuite.getFinancialSummary(user.id);
      setFinancialData(data);
    } catch (error) {
      logger.error('Error loading financial data', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  return {
    financialData,
    loading,
    refreshing,
    selectedPeriod,
    setSelectedPeriod,
    handleRefresh,
  };
};
