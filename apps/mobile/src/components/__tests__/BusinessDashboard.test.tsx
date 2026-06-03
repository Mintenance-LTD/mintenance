import React from 'react';
import { render, waitFor, fireEvent } from '../test-utils';
import BusinessDashboard from '../BusinessDashboard';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock the hooks — shape mirrors the real useBusinessDashboard return contract:
// { kpis: { revenue, jobs, satisfaction, profitability }, insights, actionItems, isLoading, lastUpdated }
jest.mock('../../hooks/useBusinessSuite', () => ({
  useBusinessDashboard: jest.fn(() => ({
    isLoading: false,
    kpis: {
      revenue: { current: 50000, trend: { trend: 'growing', percentage: 15 } },
      jobs: { completed: 25, total: 30, completionRate: 83.3 },
      satisfaction: { rating: 4.5, trend: [] },
      profitability: { margin: 35, projection: 120000 },
    },
    insights: [],
    actionItems: [],
    lastUpdated: '2026-06-01T10:00:00.000Z',
  })),
  useBusinessSuiteFormatters: jest.fn(() => ({
    formatCurrency: (val: number) => `$${val.toLocaleString()}`,
    formatPercentage: (val: number) => `${val}%`,
    getPerformanceColor: (_val: number) => '#0D9488',
    calculateGrowthTrend: (_data: unknown[]) => ({
      trend: 'growing',
      percentage: 0,
    }),
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
    const { getByText } = render(<BusinessDashboard {...defaultProps} />);

    await waitFor(() => {
      // Revenue KPI value is formatted via formatCurrency
      expect(getByText('$50,000')).toBeTruthy();
      // Jobs Completed KPI value — numeric values are passed through formatCurrency by the card renderer
      expect(getByText('$25')).toBeTruthy();
      // Client Satisfaction rating rendered as "X.X/5"
      expect(getByText('4.5/5')).toBeTruthy();
      // Profit Margin rendered as "X.X%"
      expect(getByText('35.0%')).toBeTruthy();
    });
  });

  it('should render the KPI section titles', () => {
    const { getByText } = render(<BusinessDashboard {...defaultProps} />);

    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('Jobs Completed')).toBeTruthy();
    expect(getByText('Client Satisfaction')).toBeTruthy();
    expect(getByText('Profit Margin')).toBeTruthy();
  });

  it('should show loading state initially', () => {
    const mockUseBusinessDashboard =
      require('../../hooks/useBusinessSuite').useBusinessDashboard;
    mockUseBusinessDashboard.mockReturnValueOnce({
      isLoading: true,
      kpis: null,
      insights: [],
      actionItems: [],
      lastUpdated: new Date().toISOString(),
    });

    const { getByText } = render(<BusinessDashboard {...defaultProps} />);

    expect(getByText('Loading business dashboard...')).toBeTruthy();
  });

  it('should navigate to detailed views when KPI cards are pressed', () => {
    const { getByText } = render(<BusinessDashboard {...defaultProps} />);

    const revenueCard = getByText('Revenue');
    fireEvent.press(revenueCard);

    expect(defaultProps.onNavigate).toHaveBeenCalledWith('FinancialSummary');
  });

  it('should navigate from quick action buttons', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <BusinessDashboard
        contractorId='contractor-123'
        onNavigate={onNavigate}
      />
    );

    fireEvent.press(getByText('Create Invoice'));
    expect(onNavigate).toHaveBeenCalledWith('CreateInvoice');
  });
});
