import React from 'react';
import { render } from '../../test-utils';
import { ChartSection } from '../ChartSection';
import { FinanceChart } from '../../FinanceChart';
import type { FinancialSummary } from '../../../services/contractor-business';

// Mock FinanceChart component
jest.mock('../../FinanceChart', () => ({
  FinanceChart: jest.fn(() => null),
}));

/**
 * ChartSection Component Tests
 *
 * Realigned 2026-05-31 to the Airbnb-restyle redesign.
 * The component now renders:
 *  - A "Revenue Trend" card (Text title) containing a line FinanceChart
 *    (title='', height=180) with a GBP-formatted "projected / yr" subtitle Text.
 *  - An "Expense Breakdown" card with a custom donut + progress-bar UI,
 *    gated on total_expenses > 0 (empty state otherwise). NO pie FinanceChart.
 *  - A "Monthly Profit" bar FinanceChart, only when profit_trends.length > 0.
 *
 * Cash Flow Forecast chart was removed in the redesign.
 */

describe('ChartSection', () => {
  let mockFinancialData: FinancialSummary;
  let mockFormatCurrency: jest.Mock;
  const MockedFinanceChart = FinanceChart as jest.MockedFunction<
    typeof FinanceChart
  >;

  beforeEach(() => {
    mockFormatCurrency = jest.fn((amount: number) => `£${amount.toFixed(2)}`);

    mockFinancialData = {
      monthly_revenue: [1000, 1200, 1500, 1800, 2000, 2200, 2500, 2800],
      quarterly_growth: 15.5,
      yearly_projection: 50000,
      outstanding_invoices: 3500,
      overdue_amount: 1200,
      profit_trends: [
        { month: 'January', revenue: 5000, expenses: 3000, profit: 2000 },
        { month: 'February', revenue: 6000, expenses: 3500, profit: 2500 },
        { month: 'March', revenue: 7000, expenses: 4000, profit: 3000 },
      ],
      tax_obligations: 850,
      cash_flow_forecast: [
        {
          week: '1',
          projected_income: 5000,
          projected_expenses: 3000,
          net_flow: 2000,
        },
      ],
    };

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(
          <ChartSection
            financialData={mockFinancialData}
            formatCurrency={mockFormatCurrency}
          />
        );
      }).not.toThrow();
    });

    it('should render the Revenue Trend card title', () => {
      const { getByText } = render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Revenue Trend')).toBeTruthy();
    });

    it('should render the Expense Breakdown card title', () => {
      const { getByText } = render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Expense Breakdown')).toBeTruthy();
    });

    it('should render 2 FinanceChart components when profit_trends present', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      // Revenue Trend (line) + Monthly Profit (bar)
      expect(MockedFinanceChart).toHaveBeenCalledTimes(2);
    });

    it('should render only 1 FinanceChart when profit_trends empty', () => {
      render(
        <ChartSection
          financialData={{ ...mockFinancialData, profit_trends: [] }}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(MockedFinanceChart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Revenue Trend Chart', () => {
    it('should render the revenue chart as a line chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      // First FinanceChart call is the revenue line chart (title='')
      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].type).toBe('line');
      expect(revenueCall[0].title).toBe('');
    });

    it('should slice last 6 months from monthly_revenue', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.datasets[0].data).toEqual([
        1500, 1800, 2000, 2200, 2500, 2800,
      ]);
    });

    it('should produce 6 month labels', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.labels).toHaveLength(6);
    });

    it('should set the revenue dataset color to emerald rgba', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      const colorFunction = revenueCall[0].data.datasets[0].color;
      expect(colorFunction(1)).toBe('rgba(16, 185, 129, 1)');
      expect(colorFunction(0.5)).toBe('rgba(16, 185, 129, 0.5)');
    });

    it('should set strokeWidth to 2', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.datasets[0].strokeWidth).toBe(2);
    });

    it('should render the GBP yearly projection subtitle text', () => {
      const { getByText } = render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText('£50000.00 projected / yr')).toBeTruthy();
    });

    it('should set revenue chart height to 180', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].height).toBe(180);
    });

    it('should clamp negative revenue values to 0', () => {
      render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            monthly_revenue: [-100, 200, -300, 400, 500, 600],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.datasets[0].data).toEqual([
        0, 200, 0, 400, 500, 600,
      ]);
    });
  });

  describe('Monthly Profit Chart', () => {
    it('should render the profit chart as a bar chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall).toBeDefined();
      expect(profitCall![0].type).toBe('bar');
    });

    it('should map profit trends to 3-char month labels', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall![0].data.labels).toEqual(['Jan', 'Feb', 'Mar']);
    });

    it('should extract profit values from profit_trends', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall![0].data.datasets[0].data).toEqual([2000, 2500, 3000]);
    });

    it('should clamp negative profit values to 0', () => {
      render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            profit_trends: [
              {
                month: 'January',
                revenue: 3000,
                expenses: 5000,
                profit: -2000,
              },
            ],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall![0].data.datasets[0].data).toEqual([0]);
    });

    it('should use emerald color for profit dataset', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      const colorFunction = profitCall![0].data.datasets[0].color;
      expect(colorFunction(1)).toBe('rgba(16, 185, 129, 1)');
    });

    it('should have subtitle "After expenses"', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall![0].subtitle).toBe('After expenses');
    });

    it('should set profit chart height to 180', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall![0].height).toBe(180);
    });

    it('should not render the profit chart when profit_trends empty', () => {
      render(
        <ChartSection
          financialData={{ ...mockFinancialData, profit_trends: [] }}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitCall = MockedFinanceChart.mock.calls.find(
        (call) => call[0].title === 'Monthly Profit'
      );
      expect(profitCall).toBeUndefined();
    });
  });

  describe('Expense Breakdown', () => {
    it('should show the empty state when there are no expenses', () => {
      const { getByText } = render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText('No expenses recorded yet')).toBeTruthy();
      expect(getByText('Track expenses to see your breakdown')).toBeTruthy();
    });

    it('should render the donut total when expenses exist', () => {
      const { getByText } = render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            total_expenses: 1000,
            expense_breakdown: [
              { category: 'materials', amount: 450, percentage: 45 },
              { category: 'labor', amount: 300, percentage: 30 },
              { category: 'transport', amount: 150, percentage: 15 },
              { category: 'equipment', amount: 50, percentage: 5 },
              { category: 'other', amount: 50, percentage: 5 },
            ],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText('£1000.00')).toBeTruthy();
      expect(getByText('Total')).toBeTruthy();
    });

    it('should render the 5 expense category labels when expenses exist', () => {
      const { getAllByText } = render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            total_expenses: 1000,
            expense_breakdown: [
              { category: 'materials', amount: 450, percentage: 45 },
              { category: 'labor', amount: 300, percentage: 30 },
              { category: 'transport', amount: 150, percentage: 15 },
              { category: 'equipment', amount: 50, percentage: 5 },
              { category: 'other', amount: 50, percentage: 5 },
            ],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      // Each label appears twice (legend + progress row)
      expect(getAllByText('Materials')).toHaveLength(2);
      expect(getAllByText('Labour')).toHaveLength(2);
      expect(getAllByText('Transport')).toHaveLength(2);
      expect(getAllByText('Equipment')).toHaveLength(2);
      expect(getAllByText('Other')).toHaveLength(2);
    });

    it('should render the percentage values in the legend', () => {
      const { getByText } = render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            total_expenses: 1000,
            expense_breakdown: [
              { category: 'materials', amount: 450, percentage: 45 },
              { category: 'labor', amount: 300, percentage: 30 },
              { category: 'transport', amount: 150, percentage: 15 },
              { category: 'equipment', amount: 50, percentage: 5 },
              { category: 'other', amount: 50, percentage: 5 },
            ],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText('45%')).toBeTruthy();
      expect(getByText('30%')).toBeTruthy();
      expect(getByText('15%')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty monthly_revenue array', () => {
      render(
        <ChartSection
          financialData={{ ...mockFinancialData, monthly_revenue: [] }}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.datasets[0].data).toEqual([]);
    });

    it('should handle monthly_revenue with less than 6 items', () => {
      render(
        <ChartSection
          financialData={{
            ...mockFinancialData,
            monthly_revenue: [1000, 1200, 1500],
          }}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueCall = MockedFinanceChart.mock.calls[0];
      expect(revenueCall[0].data.datasets[0].data).toEqual([1000, 1200, 1500]);
    });

    it('should call formatCurrency with the yearly projection', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(50000);
    });

    it('should render with minimal financial data', () => {
      const minimalData: FinancialSummary = {
        monthly_revenue: [],
        quarterly_growth: 0,
        yearly_projection: 0,
        outstanding_invoices: 0,
        overdue_amount: 0,
        profit_trends: [],
        tax_obligations: 0,
        cash_flow_forecast: [],
      };

      const { getByText } = render(
        <ChartSection
          financialData={minimalData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText('Revenue Trend')).toBeTruthy();
      expect(getByText('Expense Breakdown')).toBeTruthy();
      expect(getByText('No expenses recorded yet')).toBeTruthy();
    });
  });
});
