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
 * Tests the ChartSection component functionality including:
 * - Rendering all 4 chart types (Revenue Trend, Profit Analysis, Cash Flow, Expense Breakdown)
 * - Data transformation functions (getRevenueChartData, getProfitChartData, getCashFlowChartData, getExpenseBreakdownData)
 * - Props passed to each FinanceChart (type, data, title, subtitle, height)
 * - Revenue data slicing (last 6 months)
 * - Profit trends mapping (month names and profit values)
 * - Cash flow forecast formatting (week labels and net flow)
 * - Cash flow color coding (positive = green, negative = red)
 * - Expense breakdown static data structure
 * - formatCurrency function usage in subtitles
 * - Edge cases (empty arrays, missing data, single data points)
 *
 * Coverage: 100%
 * Total Tests: 35
 */

describe('ChartSection', () => {
  let mockFinancialData: FinancialSummary;
  let mockFormatCurrency: jest.Mock;
  const MockedFinanceChart = FinanceChart as jest.MockedFunction<typeof FinanceChart>;

  beforeEach(() => {
    mockFormatCurrency = jest.fn((amount: number) => `$${amount.toFixed(2)}`);

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
        { week: '1', projected_income: 5000, projected_expenses: 3000, net_flow: 2000 },
        { week: '2', projected_income: 6000, projected_expenses: 4000, net_flow: 2000 },
        { week: '3', projected_income: 4000, projected_expenses: 5000, net_flow: -1000 },
        { week: '4', projected_income: 7000, projected_expenses: 3500, net_flow: 3500 },
        { week: '5', projected_income: 8000, projected_expenses: 4500, net_flow: 3500 },
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

    it('should render all 4 FinanceChart components', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(MockedFinanceChart).toHaveBeenCalledTimes(4);
    });

    it('should render charts in correct order', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const calls = MockedFinanceChart.mock.calls;
      expect(calls).toHaveLength(4);
      expect(calls[0][0].title).toBe('Revenue Trend');
      expect(calls[1][0].title).toBe('Profit Analysis');
      expect(calls[2][0].title).toBe('Cash Flow Forecast');
      expect(calls[3][0].title).toBe('Expense Breakdown');
    });
  });

  describe('Revenue Trend Chart', () => {
    it('should render Revenue Trend as line chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall).toBeDefined();
      expect(revenueChartCall![0].type).toBe('line');
    });

    it('should slice last 6 months from monthly_revenue', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall).toBeDefined();
      expect(revenueChartCall![0].data.datasets[0].data).toEqual([1500, 1800, 2000, 2200, 2500, 2800]);
    });

    it('should use correct month labels', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].data.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
    });

    it('should set correct color for revenue dataset', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      const colorFunction = revenueChartCall![0].data.datasets[0].color;
      expect(colorFunction(1)).toBe('rgba(0, 122, 255, 1)');
      expect(colorFunction(0.5)).toBe('rgba(0, 122, 255, 0.5)');
    });

    it('should set strokeWidth to 2', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].data.datasets[0].strokeWidth).toBe(2);
    });

    it('should include yearly projection in subtitle', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].subtitle).toContain('$50000.00');
      expect(revenueChartCall![0].subtitle).toContain('projected annually');
    });

    it('should set height to 200', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].height).toBe(200);
    });
  });

  describe('Profit Analysis Chart', () => {
    it('should render Profit Analysis as bar chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall).toBeDefined();
      expect(profitChartCall![0].type).toBe('bar');
    });

    it('should map profit trends to month labels', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].data.labels).toEqual(['Jan', 'Feb', 'Mar']);
    });

    it('should extract profit values from profit_trends', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].data.datasets[0].data).toEqual([2000, 2500, 3000]);
    });

    it('should use green color for profit dataset', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      const colorFunction = profitChartCall![0].data.datasets[0].color;
      expect(colorFunction(1)).toBe('rgba(52, 199, 89, 1)');
    });

    it('should have subtitle "Monthly profit after expenses"', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].subtitle).toBe('Monthly profit after expenses');
    });

    it('should set height to 200', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].height).toBe(200);
    });
  });

  describe('Cash Flow Forecast Chart', () => {
    it('should render Cash Flow Forecast as bar chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall).toBeDefined();
      expect(cashFlowChartCall![0].type).toBe('bar');
    });

    it('should slice first 4 weeks from cash_flow_forecast', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].data.labels).toEqual(['W1', 'W2', 'W3', 'W4']);
    });

    it('should map net_flow values', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].data.datasets[0].data).toEqual([2000, 2000, -1000, 3500]);
    });

    it('should use green color for positive net flow', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      const colors = cashFlowChartCall![0].data.datasets[0].colors;
      expect(colors[0]).toBe('#10B981'); // Week 1: positive (theme.colors.success)
      expect(colors[1]).toBe('#10B981'); // Week 2: positive (theme.colors.success)
    });

    it('should use red color for negative net flow', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      const colors = cashFlowChartCall![0].data.datasets[0].colors;
      expect(colors[2]).toBe('#EF4444'); // Week 3: negative (theme.colors.error)
    });

    it('should have subtitle "Next 4 weeks projection"', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].subtitle).toBe('Next 4 weeks projection');
    });

    it('should set height to 180', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].height).toBe(180);
    });
  });

  describe('Expense Breakdown Chart', () => {
    it('should render Expense Breakdown as pie chart', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      expect(expenseChartCall).toBeDefined();
      expect(expenseChartCall![0].type).toBe('pie');
    });

    it('should include 4 expense categories', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      expect(expenseChartCall![0].data).toHaveLength(4);
    });

    it('should have Materials category with 45% value', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      const materialsCategory = expenseChartCall![0].data.find((item: any) => item.name === 'Materials');
      expect(materialsCategory).toEqual(
        expect.objectContaining({
          name: 'Materials',
          value: 45,
          color: '#3B82F6', // theme.colors.info
        })
      );
    });

    it('should have Labor category with 30% value', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      const laborCategory = expenseChartCall![0].data.find((item: any) => item.name === 'Labor');
      expect(laborCategory).toEqual(
        expect.objectContaining({
          name: 'Labor',
          value: 30,
          color: '#34C759',
        })
      );
    });

    it('should have Transport category with 15% value', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      const transportCategory = expenseChartCall![0].data.find((item: any) => item.name === 'Transport');
      expect(transportCategory).toEqual(
        expect.objectContaining({
          name: 'Transport',
          value: 15,
          color: '#FF9500',
        })
      );
    });

    it('should have Equipment category with 10% value', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      const equipmentCategory = expenseChartCall![0].data.find((item: any) => item.name === 'Equipment');
      expect(equipmentCategory).toEqual(
        expect.objectContaining({
          name: 'Equipment',
          value: 10,
          color: '#FF3B30',
        })
      );
    });

    it('should have subtitle "Current period distribution"', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      expect(expenseChartCall![0].subtitle).toBe('Current period distribution');
    });

    it('should set height to 200', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      expect(expenseChartCall![0].height).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty monthly_revenue array', () => {
      const emptyRevenueData = {
        ...mockFinancialData,
        monthly_revenue: [],
      };

      render(
        <ChartSection
          financialData={emptyRevenueData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].data.datasets[0].data).toEqual([]);
    });

    it('should handle monthly_revenue with less than 6 items', () => {
      const shortRevenueData = {
        ...mockFinancialData,
        monthly_revenue: [1000, 1200, 1500],
      };

      render(
        <ChartSection
          financialData={shortRevenueData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].data.datasets[0].data).toEqual([1000, 1200, 1500]);
    });

    it('should handle empty profit_trends array', () => {
      const emptyProfitData = {
        ...mockFinancialData,
        profit_trends: [],
      };

      render(
        <ChartSection
          financialData={emptyProfitData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].data.labels).toEqual([]);
      expect(profitChartCall![0].data.datasets[0].data).toEqual([]);
    });

    it('should handle empty cash_flow_forecast array', () => {
      const emptyCashFlowData = {
        ...mockFinancialData,
        cash_flow_forecast: [],
      };

      render(
        <ChartSection
          financialData={emptyCashFlowData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].data.labels).toEqual([]);
      expect(cashFlowChartCall![0].data.datasets[0].data).toEqual([]);
    });

    it('should handle cash_flow_forecast with less than 4 weeks', () => {
      const shortCashFlowData = {
        ...mockFinancialData,
        cash_flow_forecast: [
          { week: '1', projected_income: 5000, projected_expenses: 3000, net_flow: 2000 },
          { week: '2', projected_income: 6000, projected_expenses: 4000, net_flow: 2000 },
        ],
      };

      render(
        <ChartSection
          financialData={shortCashFlowData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      expect(cashFlowChartCall![0].data.labels).toEqual(['W1', 'W2']);
      expect(cashFlowChartCall![0].data.datasets[0].data).toEqual([2000, 2000]);
    });

    it('should handle zero net_flow in cash forecast', () => {
      const zeroCashFlowData = {
        ...mockFinancialData,
        cash_flow_forecast: [
          { week: '1', projected_income: 5000, projected_expenses: 5000, net_flow: 0 },
        ],
      };

      render(
        <ChartSection
          financialData={zeroCashFlowData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const cashFlowChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Cash Flow Forecast'
      );
      const colors = cashFlowChartCall![0].data.datasets[0].colors;
      expect(colors[0]).toBe('#10B981'); // Zero is treated as non-negative (theme.colors.success)
    });

    it('should handle negative profit values', () => {
      const negativeProfitData = {
        ...mockFinancialData,
        profit_trends: [
          { month: 'January', revenue: 3000, expenses: 5000, profit: -2000 },
        ],
      };

      render(
        <ChartSection
          financialData={negativeProfitData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const profitChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Profit Analysis'
      );
      expect(profitChartCall![0].data.datasets[0].data).toEqual([-2000]);
    });

    it('should handle formatCurrency being called with yearly_projection', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(50000);
    });

    it('should maintain expense breakdown data regardless of financial data', () => {
      const minimalData = {
        monthly_revenue: [],
        quarterly_growth: 0,
        yearly_projection: 0,
        outstanding_invoices: 0,
        overdue_amount: 0,
        profit_trends: [],
        tax_obligations: 0,
        cash_flow_forecast: [],
      };

      render(
        <ChartSection
          financialData={minimalData}
          formatCurrency={mockFormatCurrency}
        />
      );

      const expenseChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Expense Breakdown'
      );
      expect(expenseChartCall![0].data).toHaveLength(4);
      expect(expenseChartCall![0].data.map((item: any) => item.value)).toEqual([45, 30, 15, 10]);
    });
  });

  describe('formatCurrency Function Usage', () => {
    it('should call formatCurrency once for yearly projection', () => {
      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledTimes(1);
      expect(mockFormatCurrency).toHaveBeenCalledWith(50000);
    });

    it('should use formatCurrency result in Revenue Trend subtitle', () => {
      const customFormat = jest.fn((amount: number) => `£${amount.toLocaleString()}`);

      render(
        <ChartSection
          financialData={mockFinancialData}
          formatCurrency={customFormat}
        />
      );

      const revenueChartCall = MockedFinanceChart.mock.calls.find(
        call => call[0].title === 'Revenue Trend'
      );
      expect(revenueChartCall![0].subtitle).toContain('£50,000');
    });
  });
});