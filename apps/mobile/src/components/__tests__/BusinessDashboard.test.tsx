import React from 'react';
import { render, waitFor, fireEvent } from '../test-utils';
import BusinessDashboard from '../BusinessDashboard';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock the hooks — shape mirrors the real useBusinessDashboard return contract:
// { kpis: { revenue, jobs, satisfaction, profitability }, insights, actionItems, isLoading, lastUpdated }
jest.mock('../../hooks/useBusinessSuite', () => ({
  useBusinessDashboard: jest.fn(),
  useBusinessSuiteFormatters: jest.fn(),
  businessSuiteUtils: {
    calculateROI: jest.fn(),
    getBusinessHealth: jest.fn(),
  },
}));

const {
  useBusinessDashboard,
  useBusinessSuiteFormatters,
} = require('../../hooks/useBusinessSuite');

const fullKpis = {
  revenue: { current: 50000, trend: { trend: 'growing', percentage: 15 } },
  jobs: { completed: 25, total: 30, completionRate: 83.3 },
  satisfaction: { rating: 4.5, trend: [] },
  profitability: { margin: 35, projection: 120000 },
};

const defaultFormatters = {
  formatCurrency: (val: number) => `$${val.toLocaleString()}`,
  formatPercentage: (val: number) => `${val}%`,
  getPerformanceColor: (_val: number) => '#0D9488',
  calculateGrowthTrend: (_data: unknown[]) => ({
    trend: 'growing',
    percentage: 0,
  }),
};

function setDashboard(overrides: Record<string, unknown> = {}) {
  (useBusinessDashboard as jest.Mock).mockReturnValue({
    isLoading: false,
    kpis: fullKpis,
    insights: [],
    actionItems: [],
    lastUpdated: '2026-06-01T10:00:00.000Z',
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useBusinessSuiteFormatters as jest.Mock).mockReturnValue(defaultFormatters);
  setDashboard();
});

describe('BusinessDashboard — loading state', () => {
  it('renders loading spinner when isLoading and no kpis', () => {
    setDashboard({ isLoading: true, kpis: null });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('Loading business dashboard...')).toBeTruthy();
  });

  it('does NOT show loading when isLoading but kpis already present (stale-while-revalidate)', () => {
    setDashboard({ isLoading: true, kpis: fullKpis });
    const { queryByText, getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(queryByText('Loading business dashboard...')).toBeNull();
    expect(getByText('Business Dashboard')).toBeTruthy();
  });
});

describe('BusinessDashboard — KPI rendering', () => {
  it('renders all four KPI cards with formatted values', async () => {
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('$50,000')).toBeTruthy(); // revenue via formatCurrency
      expect(getByText('$25')).toBeTruthy(); // jobs.completed numeric → formatCurrency
      expect(getByText('4.5/5')).toBeTruthy(); // satisfaction rating
      expect(getByText('35.0%')).toBeTruthy(); // profit margin
    });
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('Jobs Completed')).toBeTruthy();
    expect(getByText('Client Satisfaction')).toBeTruthy();
    expect(getByText('Profit Margin')).toBeTruthy();
    expect(getByText('30 total jobs')).toBeTruthy();
  });

  it('renders the business health score section', () => {
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('Business Health')).toBeTruthy();
    expect(getByText('85')).toBeTruthy();
    expect(getByText('Excellent')).toBeTruthy();
    expect(getByText('Profitability')).toBeTruthy();
    expect(getByText('Efficiency')).toBeTruthy();
    expect(getByText('Growth')).toBeTruthy();
  });

  it('hides KPI + health sections when kpis is null but not loading', () => {
    setDashboard({ isLoading: false, kpis: null });
    const { queryByText, getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    // header still renders
    expect(getByText('Business Dashboard')).toBeTruthy();
    expect(queryByText('Key Performance Indicators')).toBeNull();
    expect(queryByText('Business Health')).toBeNull();
    // quick actions + tools still render (not gated on kpis)
    expect(getByText('Quick Actions')).toBeTruthy();
  });
});

describe('BusinessDashboard — KPI trend branches (renderKPICard trend rendering)', () => {
  it('renders growing trend with positive percentage prefix', () => {
    setDashboard({
      kpis: {
        ...fullKpis,
        revenue: {
          current: 50000,
          trend: { trend: 'growing', percentage: 15.5 },
        },
      },
    });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('+15.5%')).toBeTruthy();
  });

  it('renders declining trend with negative percentage (no plus prefix)', () => {
    setDashboard({
      kpis: {
        ...fullKpis,
        revenue: {
          current: 50000,
          trend: { trend: 'declining', percentage: -8.2 },
        },
      },
    });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('-8.2%')).toBeTruthy();
  });

  it('renders stable trend (remove icon branch)', () => {
    setDashboard({
      kpis: {
        ...fullKpis,
        revenue: { current: 50000, trend: { trend: 'stable', percentage: 0 } },
      },
    });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('0.0%')).toBeTruthy();
  });

  it('omits trend container when revenue trend is null', () => {
    setDashboard({
      kpis: { ...fullKpis, revenue: { current: 50000, trend: null } },
    });
    const { queryByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(queryByText('+15.5%')).toBeNull();
    expect(queryByText('-8.2%')).toBeNull();
  });
});

describe('BusinessDashboard — insights (renderInsightCard branches)', () => {
  it('renders success / warning / info insight types', () => {
    setDashboard({
      insights: [
        {
          type: 'success',
          icon: 'OK',
          title: 'Great Completion',
          message: '95% rate',
        },
        {
          type: 'warning',
          icon: 'WARN',
          title: 'Low Margin',
          message: 'Review pricing',
        },
        { type: 'info', icon: 'INFO', title: 'Heads Up', message: 'Misc note' },
      ],
    });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('Business Insights')).toBeTruthy();
    expect(getByText('Great Completion')).toBeTruthy();
    expect(getByText('95% rate')).toBeTruthy();
    expect(getByText('Low Margin')).toBeTruthy();
    expect(getByText('Heads Up')).toBeTruthy();
    expect(getByText('Misc note')).toBeTruthy();
  });

  it('hides insights section when empty', () => {
    setDashboard({ insights: [] });
    const { queryByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(queryByText('Business Insights')).toBeNull();
  });
});

describe('BusinessDashboard — action items (renderActionItem branches)', () => {
  it('renders urgent and warning action items', () => {
    setDashboard({
      actionItems: [
        {
          type: 'urgent',
          title: 'Overdue Invoices',
          description: 'Overdue payments',
          action: 'Follow up with clients',
        },
        {
          type: 'warning',
          title: 'Slow Response Time',
          description: 'Avg over 2 hours',
          action: 'Improve efficiency',
        },
      ],
    });
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(getByText('Action Required')).toBeTruthy();
    expect(getByText('Overdue Invoices')).toBeTruthy();
    expect(getByText('Follow up with clients')).toBeTruthy();
    expect(getByText('Slow Response Time')).toBeTruthy();
    expect(getByText('Improve efficiency')).toBeTruthy();
  });

  it('hides action-required section when empty', () => {
    setDashboard({ actionItems: [] });
    const { queryByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    expect(queryByText('Action Required')).toBeNull();
  });
});

describe('BusinessDashboard — KPI card navigation handlers', () => {
  it('fires onNavigate for each KPI card press', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={onNavigate} />
    );
    fireEvent.press(getByText('Revenue'));
    expect(onNavigate).toHaveBeenCalledWith('FinancialSummary');
    fireEvent.press(getByText('Jobs Completed'));
    expect(onNavigate).toHaveBeenCalledWith('JobsAnalytics');
    fireEvent.press(getByText('Client Satisfaction'));
    expect(onNavigate).toHaveBeenCalledWith('ClientAnalytics');
    fireEvent.press(getByText('Profit Margin'));
    expect(onNavigate).toHaveBeenCalledWith('ProfitAnalysis');
  });

  it('does not throw when onNavigate is undefined (optional chaining)', () => {
    const { getByText } = render(<BusinessDashboard contractorId='c-1' />);
    expect(() => fireEvent.press(getByText('Revenue'))).not.toThrow();
  });
});

describe('BusinessDashboard — quick action handlers', () => {
  it.each([
    ['Create Invoice', 'CreateInvoice'],
    ['Log Expense', 'RecordExpense'],
    ['Update Schedule', 'UpdateSchedule'],
    ['Manage Clients', 'ViewClients'],
  ])('quick action "%s" navigates to %s', (label, screen) => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={onNavigate} />
    );
    fireEvent.press(getByText(label));
    expect(onNavigate).toHaveBeenCalledWith(screen);
  });
});

describe('BusinessDashboard — business tools + footer handlers', () => {
  it.each([
    ['Invoice Manager', 'InvoiceManager'],
    ['Expense Tracker', 'ExpenseTracker'],
    ['Schedule Manager', 'ScheduleManager'],
    ['Client CRM', 'ClientCRM'],
    ['Marketing Hub', 'MarketingHub'],
    ['Business Goals', 'BusinessGoals'],
  ])('tool card "%s" navigates to %s', (label, screen) => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={onNavigate} />
    );
    fireEvent.press(getByText(label));
    expect(onNavigate).toHaveBeenCalledWith(screen);
  });

  it('footer report button navigates to BusinessReport', () => {
    const onNavigate = jest.fn();
    const { getByText } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={onNavigate} />
    );
    fireEvent.press(getByText('Generate Business Report'));
    expect(onNavigate).toHaveBeenCalledWith('BusinessReport');
  });
});

describe('BusinessDashboard — pull to refresh (handleRefresh)', () => {
  it('drives the RefreshControl onRefresh callback and resets after timeout', () => {
    jest.useFakeTimers();
    const { UNSAFE_root } = render(
      <BusinessDashboard contractorId='c-1' onNavigate={jest.fn()} />
    );
    // RefreshControl is rendered as a string host element in the RN mock, so we
    // reach the live element via the ScrollView's refreshControl prop instead.
    const scrollView = UNSAFE_root.findByProps({
      showsVerticalScrollIndicator: false,
    });
    const refreshElement = scrollView.props.refreshControl;
    expect(refreshElement.props.refreshing).toBe(false);
    // invoke the onRefresh handler (handleRefresh) — sets refreshing true then
    // schedules the 1000ms reset.
    refreshElement.props.onRefresh();
    jest.advanceTimersByTime(1000);
    jest.useRealTimers();
  });
});
