import React from 'react';
import { render } from '../../test-utils';
import { FinancialInsights } from '../FinancialInsights';

import type { FinancialSummary } from '../../../services/contractor-business';

/**
 * FinancialInsights Component Tests
 *
 * Realigned 2026-06-02 to the Mint Editorial redesign of FinancialInsights.
 * The component now renders a card titled "Insights" with up to 3 insight
 * rows (growth / overdue / bulk-purchasing). Each row has an icon wrapped in
 * a coloured chip + a text/subtext column. Copy, colours, sizes and structure
 * were updated by the redesign — tests below match the CURRENT component.
 *
 * Current copy:
 * - title:    "Insights"
 * - growth:   "Revenue grew {N}% this quarter" / "Keep up the momentum!"
 * - overdue:  "{currency} in overdue invoices" / "Send reminders to improve cash flow"
 * - bulk:     "Bulk purchasing could save ~15% on materials" / "Negotiate better supplier rates"
 *
 * Icons render at size 18; colours: trending-up = primary #0D9488,
 * warning = accent #F59E0B, bulb = #8B5CF6.
 */

describe('FinancialInsights', () => {
  const mockFormatCurrency = jest.fn(
    (amount: number) => `$${amount.toLocaleString()}`
  );

  const defaultFinancialData: FinancialSummary = {
    monthly_revenue: [10000, 12000, 15000],
    quarterly_growth: 25.5,
    yearly_projection: 180000,
    outstanding_invoices: 5000,
    overdue_amount: 1500,
    profit_trends: [
      { month: 'Jan', revenue: 10000, expenses: 7000, profit: 3000 },
      { month: 'Feb', revenue: 12000, expenses: 8000, profit: 4000 },
    ],
    tax_obligations: 5000,
    cash_flow_forecast: [
      {
        week: 'Week 1',
        projected_income: 5000,
        projected_expenses: 3000,
        net_flow: 2000,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(
          <FinancialInsights
            financialData={defaultFinancialData}
            formatCurrency={mockFormatCurrency}
          />
        );
      }).not.toThrow();
    });

    it('should render the insights title', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Insights')).toBeTruthy();
    });

    it('should render the main container view', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const title = getByText('Insights');
      expect(title.parent?.type).toBe('View');
    });

    it('should apply correct container styling', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const title = getByText('Insights');
      const container = title.parent;
      const styles = container?.props.style;
      const flattenedStyles = Array.isArray(styles)
        ? Object.assign({}, ...styles)
        : styles;

      expect(flattenedStyles).toMatchObject(
        expect.objectContaining({
          backgroundColor: '#FFFFFF',
          padding: 20,
          marginBottom: 32,
        })
      );
    });

    it('should apply borderRadius from theme', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const title = getByText('Insights');
      const container = title.parent;
      const styles = container?.props.style;
      const flattenedStyles = Array.isArray(styles)
        ? Object.assign({}, ...styles)
        : styles;

      expect(flattenedStyles).toHaveProperty('borderRadius');
    });
  });

  describe('Quarterly Growth Insight', () => {
    it('should display quarterly growth percentage', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/Revenue grew/)).toBeTruthy();
      expect(getByText(/25.5% this quarter/)).toBeTruthy();
    });

    it('should format growth percentage to 1 decimal place', () => {
      const data = { ...defaultFinancialData, quarterly_growth: 12.567 };
      const { getByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/12.6% this quarter/)).toBeTruthy();
    });

    it('should render trending-up icon for growth insight', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const insightCard = growthText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'trending-up' });
      expect(icon).toBeTruthy();
    });

    it('should render trending-up icon with primary color', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const insightCard = growthText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'trending-up' });
      expect(icon?.props.color).toBe('#0D9488');
    });

    it('should render trending-up icon with size 18', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const insightCard = growthText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'trending-up' });
      expect(icon?.props.size).toBe(18);
    });

    it('should display encouragement subtext for growth', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Keep up the momentum!')).toBeTruthy();
    });

    it('should handle zero growth percentage', () => {
      const data = { ...defaultFinancialData, quarterly_growth: 0 };
      const { getByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/0.0% this quarter/)).toBeTruthy();
    });

    it('should handle negative growth percentage', () => {
      const data = { ...defaultFinancialData, quarterly_growth: -15.3 };
      const { getByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/-15.3% this quarter/)).toBeTruthy();
    });

    it('should handle very large growth percentage', () => {
      const data = { ...defaultFinancialData, quarterly_growth: 250.8 };
      const { getByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/250.8% this quarter/)).toBeTruthy();
    });
  });

  describe('Overdue Invoices Warning', () => {
    it('should display overdue invoice warning when overdue_amount > 0', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/in overdue invoices/)).toBeTruthy();
    });

    it('should call formatCurrency with overdue_amount', () => {
      render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(mockFormatCurrency).toHaveBeenCalledWith(1500);
    });

    it('should display formatted overdue amount', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText(/\$1,500 in overdue invoices/)).toBeTruthy();
    });

    it('should render warning icon for overdue invoices', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const overdueText = getByText(/in overdue invoices/);
      const insightCard = overdueText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'warning' });
      expect(icon).toBeTruthy();
    });

    it('should render warning icon with accent color', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const overdueText = getByText(/in overdue invoices/);
      const insightCard = overdueText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'warning' });
      expect(icon?.props.color).toBe('#F59E0B');
    });

    it('should render warning icon with size 18', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const overdueText = getByText(/in overdue invoices/);
      const insightCard = overdueText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'warning' });
      expect(icon?.props.size).toBe(18);
    });

    it('should display reminder suggestion subtext', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Send reminders to improve cash flow')).toBeTruthy();
    });

    it('should NOT display overdue warning when overdue_amount is 0', () => {
      const data = { ...defaultFinancialData, overdue_amount: 0 };
      const { queryByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(queryByText(/overdue invoices/)).toBeNull();
    });

    it('should NOT render warning icon when overdue_amount is 0', () => {
      const data = { ...defaultFinancialData, overdue_amount: 0 };
      const { queryByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = queryByText(/Revenue grew/);
      const container = growthText?.parent?.parent?.parent;
      const warningIcon = container?.findAllByProps({ name: 'warning' });
      expect(warningIcon).toHaveLength(0);
    });

    it('should handle large overdue amounts', () => {
      const data = { ...defaultFinancialData, overdue_amount: 150000 };
      const customFormat = jest.fn(
        (amount: number) => `$${amount.toLocaleString()}`
      );
      render(
        <FinancialInsights financialData={data} formatCurrency={customFormat} />
      );
      expect(customFormat).toHaveBeenCalledWith(150000);
    });

    it('should handle small overdue amounts', () => {
      const data = { ...defaultFinancialData, overdue_amount: 50 };
      const customFormat = jest.fn((amount: number) => `$${amount.toFixed(2)}`);
      const { getByText } = render(
        <FinancialInsights financialData={data} formatCurrency={customFormat} />
      );
      expect(getByText(/in overdue invoices/)).toBeTruthy();
    });
  });

  describe('Bulk Purchasing Insight', () => {
    it('should display bulk purchasing suggestion', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(
        getByText(/Bulk purchasing could save ~15% on materials/)
      ).toBeTruthy();
    });

    it('should display supplier negotiation subtext', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      expect(getByText('Negotiate better supplier rates')).toBeTruthy();
    });

    it('should render bulb icon for bulk purchasing insight', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const bulkText = getByText(/Bulk purchasing/);
      const insightCard = bulkText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'bulb' });
      expect(icon).toBeTruthy();
    });

    it('should render bulb icon with purple color', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const bulkText = getByText(/Bulk purchasing/);
      const insightCard = bulkText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'bulb' });
      expect(icon?.props.color).toBe('#8B5CF6');
    });

    it('should render bulb icon with size 18', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const bulkText = getByText(/Bulk purchasing/);
      const insightCard = bulkText.parent?.parent;
      const icon = insightCard?.findByProps({ name: 'bulb' });
      expect(icon?.props.size).toBe(18);
    });
  });

  describe('Insight Card Styling', () => {
    it('should apply flexDirection row to insight cards', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const insightCard = growthText.parent?.parent;
      const styles = insightCard?.props.style;
      const flattened = Array.isArray(styles)
        ? Object.assign({}, ...styles.filter(Boolean))
        : styles;
      expect(flattened).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: 12,
        })
      );
    });

    it('should apply border bottom to insight cards', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const insightCard = growthText.parent?.parent;
      const styles = insightCard?.props.style;
      const flattened = Array.isArray(styles)
        ? Object.assign({}, ...styles.filter(Boolean))
        : styles;
      expect(flattened.borderBottomColor).toBe('#F0F0F0');
      expect(flattened.borderBottomWidth).toBeGreaterThan(0);
    });

    it('should apply correct content styling', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      const contentContainer = growthText.parent;
      expect(contentContainer?.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });

    it('should apply correct text styling', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const growthText = getByText(/Revenue grew/);
      expect(growthText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 14,
          color: '#222222',
          fontWeight: '600',
          lineHeight: 20,
        })
      );
    });

    it('should apply correct subtext styling', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const subtext = getByText('Keep up the momentum!');
      expect(subtext.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
          color: '#717171',
          lineHeight: 16,
        })
      );
    });

    it('should apply correct title styling', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );
      const title = getByText('Insights');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 18,
          fontWeight: '700',
          color: '#222222',
          marginBottom: 16,
        })
      );
    });
  });

  describe('Edge Cases and Re-renders', () => {
    it('should handle component re-render with different data', () => {
      const { getByText, rerender } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText(/25.5% this quarter/)).toBeTruthy();

      const newData = { ...defaultFinancialData, quarterly_growth: 50.2 };
      rerender(
        <FinancialInsights
          financialData={newData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText(/50.2% this quarter/)).toBeTruthy();
    });

    it('should toggle overdue warning on data change', () => {
      const { getByText, rerender, queryByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(getByText(/overdue invoices/)).toBeTruthy();

      const newData = { ...defaultFinancialData, overdue_amount: 0 };
      rerender(
        <FinancialInsights
          financialData={newData}
          formatCurrency={mockFormatCurrency}
        />
      );

      expect(queryByText(/overdue invoices/)).toBeNull();
    });

    it('should handle custom formatCurrency function', () => {
      const customFormat = jest.fn((amount: number) => `€${amount.toFixed(2)}`);
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={customFormat}
        />
      );

      expect(customFormat).toHaveBeenCalledWith(1500);
      expect(getByText(/€1500.00 in overdue invoices/)).toBeTruthy();
    });

    it('should display all three insights when overdue_amount > 0', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={defaultFinancialData}
          formatCurrency={mockFormatCurrency}
        />
      );

      // Growth insight
      expect(getByText(/Revenue grew/)).toBeTruthy();
      // Overdue insight
      expect(getByText(/in overdue invoices/)).toBeTruthy();
      // Bulk purchasing insight
      expect(getByText(/Bulk purchasing/)).toBeTruthy();
    });

    it('should display only two insights when overdue_amount is 0', () => {
      const data = { ...defaultFinancialData, overdue_amount: 0 };
      const { getByText, queryByText } = render(
        <FinancialInsights
          financialData={data}
          formatCurrency={mockFormatCurrency}
        />
      );

      // Growth insight
      expect(getByText(/Revenue grew/)).toBeTruthy();
      // No overdue insight
      expect(queryByText(/in overdue invoices/)).toBeNull();
      // Bulk purchasing insight
      expect(getByText(/Bulk purchasing/)).toBeTruthy();
    });
  });
});
