/**
 * Home Screen ViewModel
 *
 * Business logic and state management for the Home screen.
 * Separates data operations from UI rendering.
 *
 * @filesize Target: <200 lines
 * @compliance Architecture principles - MVVM pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { UserService, ContractorStats, UserProfile } from '../../../services/UserService';
import { JobService } from '../../../services/JobService';
import { logger } from '../../../utils/logger';

export interface HomeState {
  contractorStats: ContractorStats | null;
  previousContractors: UserProfile[];
  homeownerJobs: any[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  showFindContractorsButton: boolean;
}

export interface HomeActions {
  loadContractorData: (opts?: { skipJobs?: boolean }) => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleError: (error: string | null) => void;
  clearError: () => void;
}

export interface HomeViewModel extends HomeState, HomeActions {}

/**
 * Custom hook that provides Home screen business logic
 */
export const useHomeViewModel = (user: any): HomeViewModel => {
  // State management
  const [contractorStats, setContractorStats] = useState<ContractorStats | null>(null);
  const [previousContractors, setPreviousContractors] = useState<UserProfile[]>([]);
  const [homeownerJobs, setHomeownerJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFindContractorsButton, setShowFindContractorsButton] = useState(true);

  /**
   * Load contractor data from services
   */
  const loadContractorData = useCallback(async (opts?: { skipJobs?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      if (user.role === 'contractor') {
        await loadContractorSpecificData();
      } else {
        await loadHomeownerSpecificData(opts);
      }
    } catch (err) {
      logger.error('HomeViewModel: Error loading data', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  /**
   * Load data specific to contractors
   */
  const loadContractorSpecificData = async () => {
    const [stats, previousClients] = await Promise.all([
      UserService.getContractorStats(user.id),
      UserService.getPreviousContractors(user.id)
    ]);

    setContractorStats(stats);
    setPreviousContractors(previousClients || []);
  };

  /**
   * Load data specific to homeowners
   */
  const loadHomeownerSpecificData = async (opts?: { skipJobs?: boolean }) => {
    const promises: Promise<any>[] = [
      UserService.getPreviousContractors(user.id)
    ];

    if (!opts?.skipJobs) {
      promises.push(JobService.getJobsByHomeowner(user.id));
    }

    const [previousContracts, jobs] = await Promise.all(promises);

    setPreviousContractors(previousContracts || []);

    if (!opts?.skipJobs) {
      setHomeownerJobs(jobs || []);
    }
  };

  /**
   * Handle refresh action
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContractorData();
  }, [loadContractorData]);

  /**
   * Handle error state
   */
  const handleError = useCallback((error: string | null) => {
    setError(error);
    if (error) {
      logger.error('HomeViewModel: Error occurred', error);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on user change
  useEffect(() => {
    loadContractorData();
  }, [user, loadContractorData]);

  // Return ViewModel interface
  return {
    // State
    contractorStats,
    previousContractors,
    homeownerJobs,
    loading,
    refreshing,
    error,
    showFindContractorsButton,

    // Actions
    loadContractorData,
    handleRefresh,
    handleError,
    clearError,
  };
};

/**
 * Home ViewModel class (alternative implementation)
 * Use this for more complex state management if needed
 */
export class HomeViewModelClass {
  private state: HomeState;
  private setState: (updates: Partial<HomeState>) => void;

  constructor(
    initialState: HomeState,
    setState: (updates: Partial<HomeState>) => void
  ) {
    this.state = initialState;
    this.setState = setState;
  }

  async loadData(user: any, opts?: { skipJobs?: boolean }): Promise<void> {
    if (!user) {
      this.setState({ loading: false });
      return;
    }

    try {
      this.setState({ error: null });

      if (user.role === 'contractor') {
        await this.loadContractorData(user.id);
      } else {
        await this.loadHomeownerData(user.id, opts);
      }
    } catch (error) {
      logger.error('HomeViewModelClass: Error loading data', error);
      this.setState({ error: 'Failed to load dashboard data. Please try again.' });
    } finally {
      this.setState({ loading: false, refreshing: false });
    }
  }

  private async loadContractorData(userId: string): Promise<void> {
    const [stats, previousClients] = await Promise.all([
      UserService.getContractorStats(userId),
      UserService.getPreviousContractors(userId)
    ]);

    this.setState({
      contractorStats: stats,
      previousContractors: previousClients || []
    });
  }

  private async loadHomeownerData(userId: string, opts?: { skipJobs?: boolean }): Promise<void> {
    const promises: Promise<any>[] = [
      UserService.getPreviousContractors(userId)
    ];

    if (!opts?.skipJobs) {
      promises.push(JobService.getJobsByHomeowner(userId));
    }

    const [previousContracts, jobs] = await Promise.all(promises);

    this.setState({
      previousContractors: previousContracts || [],
      homeownerJobs: !opts?.skipJobs ? (jobs || []) : this.state.homeownerJobs
    });
  }

  handleRefresh(user: any): Promise<void> {
    this.setState({ refreshing: true });
    return this.loadData(user);
  }

  setError(error: string | null): void {
    this.setState({ error });
    if (error) {
      logger.error('HomeViewModelClass: Error set', error);
    }
  }

  clearError(): void {
    this.setState({ error: null });
  }
}