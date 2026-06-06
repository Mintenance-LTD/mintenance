/**
 * Unit tests for useBusinessDashboard module:
 *  - useBusinessSuiteFormatters (formatters + insight/colour/trend helpers)
 *  - useBusinessDashboard (KPI + action-item composition)
 *  - businessSuiteUtils (pure goal validation + business-health scoring)
 */
import { renderHook } from '@testing-library/react-native';

jest.mock('@/services/contractor-business', () => ({
  contractorBusinessSuite: {},
}));
jest.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ formatters: { currency: (n: number) => `£${n}` } }),
}));

const mockUseBusinessMetrics = jest.fn();
const mockUseFinancialSummary = jest.fn();
jest.mock('@/hooks/business-suite/useBusinessMetrics', () => ({
  useBusinessMetrics: (...a: unknown[]) => mockUseBusinessMetrics(...a),
  useFinancialSummary: (...a: unknown[]) => mockUseFinancialSummary(...a),
}));
const mockUseClientAnalytics = jest.fn();
jest.mock('@/hooks/business-suite/useClients', () => ({
  useClientAnalytics: (...a: unknown[]) => mockUseClientAnalytics(...a),
}));

import {
  useBusinessSuiteFormatters,
  useBusinessDashboard,
  businessSuiteUtils,
} from '../useBusinessDashboard';

const metrics = {
  total_revenue: 10000,
  average_job_value: 500,
  completion_rate: 92,
  client_satisfaction: 4.6,
  repeat_client_rate: 45,
  response_time_avg: 30,
  quote_conversion_rate: 60,
  profit_margin: 15,
  completed_jobs: 18,
  total_jobs: 20,
  updated_at: '2026-01-01',
};

describe('useBusinessSuiteFormatters', () => {
  const setup = () =>
    renderHook(() => useBusinessSuiteFormatters()).result.current;

  it('formats currency, percentage and response time', () => {
    const f = setup();
    expect(f.formatCurrency(100)).toBe('£100');
    expect(f.formatPercentage(50)).toBe('50.0%');
    expect(f.formatResponseTime(30)).toBe('30m');
    expect(f.formatResponseTime(90)).toBe('1h 30m');
    expect(f.formatResponseTime(120)).toBe('2h');
  });

  it('formats the full business-metrics object', () => {
    const out = setup().formatBusinessMetrics(metrics as never);
    expect(out.totalRevenue).toBe('£10000');
    expect(out.clientSatisfaction).toBe('4.6/5.0');
  });

  it('maps performance values to threshold colours', () => {
    const color = setup().getPerformanceColor;
    const t = { excellent: 90, good: 70, average: 50 };
    expect(color(95, t)).toBeDefined();
    expect(color(75, t)).toBeDefined();
    expect(color(55, t)).toBeDefined();
    expect(color(10, t)).toBeDefined();
  });

  it('derives business insights across thresholds', () => {
    const good = setup().getBusinessInsights(metrics as never);
    expect(good.some((i) => i.type === 'success')).toBe(true);
    const poor = setup().getBusinessInsights({
      ...metrics,
      completion_rate: 60,
      client_satisfaction: 3,
      repeat_client_rate: 10,
      profit_margin: 10,
    } as never);
    expect(poor.some((i) => i.type === 'warning')).toBe(true);
  });

  it('calculates the growth trend across cases', () => {
    const trend = setup().calculateGrowthTrend;
    expect(trend([1]).trend).toBe('stable'); // <2 points
    expect(trend([0, 0, 0, 0, 0, 0]).trend).toBe('stable'); // previous 0
    expect(trend([1, 1, 1, 5, 5, 5]).trend).toBe('growing');
    expect(trend([5, 5, 5, 1, 1, 1]).trend).toBe('declining');
    expect(trend([10, 10, 10, 10, 10, 10]).trend).toBe('stable');
  });

  it('formats invoice status (known + fallback) and lists categories', () => {
    const f = setup();
    expect(f.formatInvoiceStatus('paid').label).toBe('Paid');
    expect(f.formatInvoiceStatus('bogus').label).toBe('Draft');
    expect(f.getExpenseCategories()).toHaveLength(5);
    expect(f.calculateROI(150, 100)).toBeCloseTo(50, 5);
    expect(f.calculateROI(100, 0)).toBe(0);
  });
});

describe('useBusinessDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBusinessMetrics.mockReturnValue({ metrics, isLoading: false });
    mockUseFinancialSummary.mockReturnValue({
      data: {
        monthly_revenue: [1, 1, 1, 5, 5, 5],
        overdue_amount: 200,
        yearly_projection: 50000,
      },
      isLoading: false,
    });
    mockUseClientAnalytics.mockReturnValue({
      data: { trends: { satisfactionTrend: [4, 4.5, 4.6] } },
      isLoading: false,
    });
  });

  it('builds KPIs, insights and action items when metrics exist', () => {
    const { result } = renderHook(() => useBusinessDashboard('c1'));
    expect(result.current.kpis?.revenue.current).toBe(10000);
    expect(result.current.kpis?.revenue.trend?.trend).toBe('growing');
    expect(
      result.current.actionItems.some((a) => a.title === 'Overdue Invoices')
    ).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('adds a slow-response action item and handles missing metrics', () => {
    mockUseBusinessMetrics.mockReturnValue({
      metrics: { ...metrics, response_time_avg: 200 },
      isLoading: false,
    });
    mockUseFinancialSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    const { result } = renderHook(() => useBusinessDashboard('c1'));
    expect(
      result.current.actionItems.some((a) => a.title === 'Slow Response Time')
    ).toBe(true);

    mockUseBusinessMetrics.mockReturnValue({ metrics: null, isLoading: true });
    const { result: r2 } = renderHook(() => useBusinessDashboard('c1'));
    expect(r2.current.kpis).toBeNull();
    expect(r2.current.insights).toEqual([]);
  });
});

describe('businessSuiteUtils', () => {
  it('generates invoice + schedule templates', () => {
    expect(businessSuiteUtils.generateInvoiceTemplate().tax_rate).toBe(0.2);
    expect(
      businessSuiteUtils.getScheduleTemplates().weekday.morning.start_time
    ).toBe('08:00');
  });

  it('validates a business goal', () => {
    expect(
      businessSuiteUtils.validateBusinessGoal({
        title: 'Grow',
        target_value: 100,
        target_date: '2999-01-01',
      } as never).isValid
    ).toBe(true);
    const bad = businessSuiteUtils.validateBusinessGoal({
      title: ' ',
      target_value: 0,
      target_date: '2000-01-01',
    } as never);
    expect(bad.isValid).toBe(false);
    expect(bad.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('scores business health across levels', () => {
    const excellent = businessSuiteUtils.calculateBusinessHealth(
      {
        profit_margin: 40,
        completion_rate: 95,
        client_satisfaction: 5,
      } as never,
      { quarterly_growth: 20, overdue_amount: 0 } as never
    );
    expect(excellent.level).toBe('excellent');

    const poor = businessSuiteUtils.calculateBusinessHealth(
      {
        profit_margin: 2,
        completion_rate: 20,
        client_satisfaction: 1,
      } as never,
      { quarterly_growth: -20, overdue_amount: 100000 } as never
    );
    expect(['fair', 'needs_improvement']).toContain(poor.level);
  });
});
