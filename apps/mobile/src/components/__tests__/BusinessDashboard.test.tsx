
jest.mock('react-native', () => require('../../__mocks__/react-native.js'));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, waitFor, fireEvent } from '../test-utils';
import BusinessDashboard from '../BusinessDashboard';

// Mock the hooks
jest.mock('../../hooks/useBusinessSuite', () => ({
  useBusinessDashboard: jest.fn(() => ({
    isLoading: false,
    kpis: {
      totalRevenue: { value: 50000, trend: 15 },
      completedJobs: { value: 25, trend: 10 },
      customerSatisfaction: { value: 4.5, trend: 5 },
      profitMargin: { value: 35, trend: -2 },
    },
    recentActivity: [],
    insights: [],
    analytics: {
      monthlyRevenue: [],
      categoryBreakdown: [],
      customerRetention: 85,
    },
  })),
  useBusinessSuiteFormatters: jest.fn(() => ({
    formatCurrency: (val: number) => `$${val.toLocaleString()}`,
    formatPercentage: (val: number) => `${val}%`,
    getPerformanceColor: (val: number) => val > 0 ? '#4CAF50' : '#F44336',
    calculateGrowthTrend: (data: any[]) => 'up',
  })),
  businessSuiteUtils: {
    calculateROI: jest.fn(),
    getBusinessHealth: jest.fn(),
  },
}));

describe('BusinessDashboard', () => {
  const defaultProps = {
    contractorId: 'contractor-123',
    onNavigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render dashboard with KPI data', async () => {
    const { getByText } = render(
      <BusinessDashboard {...defaultProps} />
    );

    await waitFor(() => {
      expect(getByText('$50,000')).toBeTruthy();
      expect(getByText('25')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
      expect(getByText('35%')).toBeTruthy();
    });
  });

  it('should show loading state initially', () => {
    const mockUseBusinessDashboard = require('../../hooks/useBusinessSuite').useBusinessDashboard;
    mockUseBusinessDashboard.mockReturnValueOnce({
      isLoading: true,
      kpis: null,
    });

    const { getByTestId } = render(
      <BusinessDashboard {...defaultProps} />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should handle refresh action', async () => {
    const { getByTestId } = render(
      <BusinessDashboard {...defaultProps} />
    );

    const scrollView = getByTestId('dashboard-scroll');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      // Refresh should complete
      expect(scrollView.props.refreshControl.props.refreshing).toBe(false);
    });
  });

  it('should navigate to detailed views when KPI cards are pressed', () => {
    const { getByTestId } = render(
      <BusinessDashboard {...defaultProps} />
    );

    const revenueCard = getByTestId('kpi-revenue');
    act(() => fireEvent.press(revenueCard));

    expect(defaultProps.onNavigate).toHaveBeenCalledWith(
      'RevenueDetails',
      expect.any(Object)
    );
  });

  it('should handle missing contractor ID', () => {
    const { getByText } = render(
      <BusinessDashboard contractorId="" onNavigate={jest.fn()} />
    );

    expect(getByText('No contractor selected')).toBeTruthy();
  });
});