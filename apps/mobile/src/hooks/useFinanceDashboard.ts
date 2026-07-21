import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  ContractorBusinessSuite,
  type FinancialSummary,
} from '../services/contractor-business';

type Period = '3m' | '6m' | '12m';

/**
 * Trailing months each selector option represents. Until 2026-07-20 the
 * selected period was stored but never passed to the query, so tapping
 * 3/6/12 Months refetched identical data and redrew an identical chart.
 */
const PERIOD_MONTHS: Record<Period, number> = { '3m': 3, '6m': 6, '12m': 12 };

export const useFinanceDashboard = () => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(
    null
  );
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
      const data = await ContractorBusinessSuite.finance.getFinancialSummary(
        user.id,
        PERIOD_MONTHS[selectedPeriod]
      );
      setFinancialData(data);
    } catch (err) {
      logger.error('Error loading financial data', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        `Failed to load financial data: ${message}. Pull down to retry.`
      );
      // Keep previous data visible if available
    } finally {
      setLoading(false);
    }
    // `selectedPeriod` is read above, so it MUST be a dependency — otherwise
    // the callback closes over the period it was created with and every
    // switch refetches the previous window.
  }, [user, selectedPeriod]);

  useEffect(() => {
    setLoading(true);
    loadFinancialData();
    // loadFinancialData changes identity when the period changes, so this
    // covers both the initial load and every period switch.
  }, [loadFinancialData]);

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
    /** Months the current selection covers — for labelling the trend. */
    periodMonths: PERIOD_MONTHS[selectedPeriod],
    setSelectedPeriod,
    handleRefresh,
  };
};
