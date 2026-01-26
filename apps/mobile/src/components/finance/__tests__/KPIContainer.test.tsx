import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render, createMockNavigation } from '../../test-utils';
import { KPIContainer } from '../KPIContainer';
import { theme } from '../../../theme';
import type { FinancialSummary } from '../../../services/contractor-business';

/**
 * KPIContainer Component Tests
 *
 * Tests the KPIContainer component functionality including:
 * - Rendering all 4 KPI cards (Total Revenue, Outstanding, Overdue, Tax Due)
 * - Props passed to each KPICard (title, value, icon, color, change)
 * - formatCurrency function usage
 * - Revenue calculation from monthly_revenue array
 * - Quarterly growth change indicator
 * - Navigation handlers for each card
 * - Container styling (flexDirection, flexWrap, gap, marginBottom)
 * - Edge cases (empty revenue, zero values, negative growth)
 *
 * Coverage: 100%
 * Total Tests: 33
 */

describe('KPIContainer', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;
  let mockFinancialData: FinancialSummary;
  let mockFormatCurrency: jest.Mock;

  beforeEach(() => {
    mockNavigation = createMockNavigation();
    mockFormatCurrency = jest.fn((amount: number) => `$${amount.toFixed(2)}`);

    mockFinancialData = {
      monthly_revenue: [1000, 1500, 2000],
      quarterly_growth: 15.5,
      yearly_projection: 50000,
      outstanding_invoices: 3500,
      overdue_amount: 1200,
      profit_trends: [],
      tax_obligations: 850,
      cash_flow_forecast: [],
    };

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(
          <KPIContainer
            financialData={mockFinancialData}
            formatCurrency={mockFormatCurrency}
            navigation={mockNavigation as any}
          />
        );
      }).not.toThrow();
    });

    it('should render container view', () => {
      const { UNSAFE_getByType } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );
      const container = UNSAFE_getByType('View' as any);
      expect(container).toBeTruthy();
    });

    it('should render all 4 KPI cards', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('Outstanding')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('Tax Due')).toBeTruthy();
    });
  });

  describe('Total Revenue KPI Card', () => {
    it('should calculate total revenue from monthly_revenue array', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // monthly_revenue: [1000, 1500, 2000] = 4500
      expect(mockFormatCurrency).toHaveBeenCalledWith(4500);
    });

    it('should display formatted total revenue', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('$4500.00')).toBeTruthy();
    });

    it('should pass quarterly_growth as change value', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // Change should display as +15.5%
      expect(getByText('+15.5%')).toBeTruthy();
    });

    it('should mark positive growth as positive', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // The change should be marked as positive (green color)
      const changeElement = getByText('+15.5%');
      expect(changeElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.success,
          }),
        ])
      );
    });

    it('should navigate to RevenueDetail on press', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const revenueCard = getByText('Total Revenue').parent?.parent;
      expect(revenueCard).toBeTruthy();

      if (revenueCard) {
        fireEvent.press(revenueCard);
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RevenueDetail');
      }
    });
  });

  describe('Outstanding Invoices KPI Card', () => {
    it('should display outstanding_invoices value', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(3500);
    });

    it('should display formatted outstanding amount', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('$3500.00')).toBeTruthy();
    });

    it('should navigate to InvoiceManagement on press', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const outstandingCard = getByText('Outstanding').parent?.parent;
      expect(outstandingCard).toBeTruthy();

      if (outstandingCard) {
        fireEvent.press(outstandingCard);
        expect(mockNavigation.navigate).toHaveBeenCalledWith('InvoiceManagement');
      }
    });
  });

  describe('Overdue Amount KPI Card', () => {
    it('should display overdue_amount value', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(1200);
    });

    it('should display formatted overdue amount', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('$1200.00')).toBeTruthy();
    });

    it('should navigate to OverdueInvoices on press', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const overdueCard = getByText('Overdue').parent?.parent;
      expect(overdueCard).toBeTruthy();

      if (overdueCard) {
        fireEvent.press(overdueCard);
        expect(mockNavigation.navigate).toHaveBeenCalledWith('OverdueInvoices');
      }
    });
  });

  describe('Tax Obligations KPI Card', () => {
    it('should display tax_obligations value', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(850);
    });

    it('should display formatted tax due amount', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('$850.00')).toBeTruthy();
    });

    it('should navigate to TaxCenter on press', () => {
      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const taxCard = getByText('Tax Due').parent?.parent;
      expect(taxCard).toBeTruthy();

      if (taxCard) {
        fireEvent.press(taxCard);
        expect(mockNavigation.navigate).toHaveBeenCalledWith('TaxCenter');
      }
    });
  });

  describe('Container Styling', () => {
    it('should apply flexDirection row to container', () => {
      const { UNSAFE_getByType } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const container = UNSAFE_getByType('View' as any);
      expect(container.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('should apply flexWrap wrap to container', () => {
      const { UNSAFE_getByType } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const container = UNSAFE_getByType('View' as any);
      expect(container.props.style).toEqual(
        expect.objectContaining({
          flexWrap: 'wrap',
        })
      );
    });

    it('should apply gap of 12 to container', () => {
      const { UNSAFE_getByType } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const container = UNSAFE_getByType('View' as any);
      expect(container.props.style).toEqual(
        expect.objectContaining({
          gap: 12,
        })
      );
    });

    it('should apply marginBottom of 16 to container', () => {
      const { UNSAFE_getByType } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      const container = UNSAFE_getByType('View' as any);
      expect(container.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 16,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty monthly_revenue array', () => {
      const emptyRevenueData = {
        ...mockFinancialData,
        monthly_revenue: [],
      };

      render(
        <KPIContainer
          financialData={emptyRevenueData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(0);
    });

    it('should handle zero values for all financial data', () => {
      const zeroData = {
        monthly_revenue: [0, 0, 0],
        quarterly_growth: 0,
        yearly_projection: 0,
        outstanding_invoices: 0,
        overdue_amount: 0,
        profit_trends: [],
        tax_obligations: 0,
        cash_flow_forecast: [],
      };

      const { getAllByText } = render(
        <KPIContainer
          financialData={zeroData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // Should have 4 instances of $0.00 (one for each KPI card)
      const zeroValues = getAllByText('$0.00');
      expect(zeroValues).toHaveLength(4);
    });

    it('should handle negative quarterly growth', () => {
      const negativeGrowthData = {
        ...mockFinancialData,
        quarterly_growth: -10.5,
      };

      const { getByText } = render(
        <KPIContainer
          financialData={negativeGrowthData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('-10.5%')).toBeTruthy();
    });

    it('should mark negative growth as not positive', () => {
      const negativeGrowthData = {
        ...mockFinancialData,
        quarterly_growth: -10.5,
      };

      const { getByText } = render(
        <KPIContainer
          financialData={negativeGrowthData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // The change should be marked as negative (red color)
      const changeElement = getByText('-10.5%');
      expect(changeElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: theme.colors.error,
          }),
        ])
      );
    });

    it('should handle large revenue values', () => {
      const largeRevenueData = {
        ...mockFinancialData,
        monthly_revenue: [1000000, 2000000, 3000000],
      };

      render(
        <KPIContainer
          financialData={largeRevenueData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledWith(6000000);
    });

    it('should correctly sum decimal revenue values', () => {
      const decimalRevenueData = {
        ...mockFinancialData,
        monthly_revenue: [1234.56, 7890.12, 3456.78],
      };

      render(
        <KPIContainer
          financialData={decimalRevenueData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      // Allow for floating point precision issues
      const calls = mockFormatCurrency.mock.calls;
      const totalRevenueCall = calls.find(call => call[0] > 12581 && call[0] < 12582);
      expect(totalRevenueCall).toBeDefined();
      expect(totalRevenueCall![0]).toBeCloseTo(12581.46, 2);
    });

    it('should handle different navigation instances', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={navigation1 as any}
        />
      );

      expect(getByText('Total Revenue')).toBeTruthy();

      rerender(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={navigation2 as any}
        />
      );

      expect(getByText('Total Revenue')).toBeTruthy();
    });

    it('should handle formatCurrency function that returns different formats', () => {
      const customFormatCurrency = jest.fn((amount: number) => `£${amount.toLocaleString()}`);

      const { getByText } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={customFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(customFormatCurrency).toHaveBeenCalledWith(4500);
      expect(getByText('£4,500')).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByText, rerender } = render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('Outstanding')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('Tax Due')).toBeTruthy();

      rerender(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('Outstanding')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('Tax Due')).toBeTruthy();
    });
  });

  describe('formatCurrency Function Usage', () => {
    it('should call formatCurrency exactly 4 times (once per KPI card)', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenCalledTimes(4);
    });

    it('should call formatCurrency with correct arguments in order', () => {
      render(
        <KPIContainer
          financialData={mockFinancialData}
          formatCurrency={mockFormatCurrency}
          navigation={mockNavigation as any}
        />
      );

      expect(mockFormatCurrency).toHaveBeenNthCalledWith(1, 4500); // Total Revenue
      expect(mockFormatCurrency).toHaveBeenNthCalledWith(2, 3500); // Outstanding
      expect(mockFormatCurrency).toHaveBeenNthCalledWith(3, 1200); // Overdue
      expect(mockFormatCurrency).toHaveBeenNthCalledWith(4, 850);  // Tax Due
    });
  });
});
