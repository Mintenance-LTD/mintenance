import React from 'react';
import { render } from '../../test-utils';
import { FinancialInsights, buildInsights } from '../FinancialInsights';

import type { FinancialSummary } from '../../../services/contractor-business';

/**
 * FinancialInsights Component Tests
 *
 * Rewritten 2026-07-20 alongside the component. The previous suite asserted
 * the behaviour an audit flagged as dishonest and therefore pinned it in
 * place:
 *   - "Revenue grew {N}% this quarter" rendered unconditionally, so a
 *     contractor with no revenue was told their revenue "grew 0.0%", and a
 *     decline rendered as "grew -20.0%". A test explicitly asserted the
 *     zero case ("should handle zero growth percentage").
 *   - A whole `describe('Bulk Purchasing Insight')` block covered a
 *     hardcoded "Bulk purchasing could save ~15% on materials" tip shown to
 *     every contractor regardless of their data.
 *
 * The component now derives every line from the contractor's own figures and
 * renders nothing when there is nothing true to say. These tests assert that
 * contract, and guard against the fabricated copy returning.
 */

describe('FinancialInsights', () => {
  const fmt = (amount: number) => `£${amount.toLocaleString()}`;

  // A summary with nothing worth commenting on: no escrow, nothing overdue,
  // no growth basis, no expenses.
  const emptyData: FinancialSummary = {
    monthly_revenue: [0, 0, 0],
    quarterly_growth: 0,
    yearly_projection: 0,
    outstanding_invoices: 0,
    overdue_amount: 0,
    profit_trends: [],
    tax_obligations: 0,
    cash_flow_forecast: [],
  };

  const data = (over: Partial<FinancialSummary> = {}): FinancialSummary => ({
    ...emptyData,
    ...over,
  });

  describe('buildInsights — only says what the data supports', () => {
    it('returns nothing when there is nothing true to say', () => {
      expect(buildInsights(emptyData, fmt)).toEqual([]);
    });

    it('surfaces escrow the contractor is waiting on', () => {
      const [insight] = buildInsights(data({ escrow_in_flight: 3.98 }), fmt);
      expect(insight.key).toBe('escrow');
      expect(insight.text).toBe('£3.98 waiting on approval');
      expect(insight.sub).toContain('homeowner approves');
    });

    it('omits the escrow line when nothing is held', () => {
      const keys = buildInsights(data({ escrow_in_flight: 0 }), fmt).map(
        (i) => i.key
      );
      expect(keys).not.toContain('escrow');
    });

    it('surfaces overdue invoices', () => {
      const [insight] = buildInsights(data({ overdue_amount: 1500 }), fmt);
      expect(insight.key).toBe('overdue');
      expect(insight.text).toBe('£1,500 in overdue invoices');
    });

    it('says "grew" for a rise and "fell" for a drop', () => {
      const up = buildInsights(data({ quarterly_growth: 25.5 }), fmt)[0];
      expect(up.text).toBe('Revenue grew 25.5% this quarter');
      expect(up.icon).toBe('trending-up');

      const down = buildInsights(data({ quarterly_growth: -20 }), fmt)[0];
      // Regression: this used to read "Revenue grew -20.0% this quarter".
      expect(down.text).toBe('Revenue fell 20.0% this quarter');
      expect(down.icon).toBe('trending-down');
    });

    it('stays silent at exactly zero growth rather than claiming 0.0%', () => {
      // getFinancialSummary returns 0 both for a flat quarter and when there
      // is not enough history to compare — neither is worth a sentence.
      const keys = buildInsights(data({ quarterly_growth: 0 }), fmt).map(
        (i) => i.key
      );
      expect(keys).not.toContain('growth');
    });

    it('formats growth to one decimal place', () => {
      expect(
        buildInsights(data({ quarterly_growth: 12.567 }), fmt)[0].text
      ).toBe('Revenue grew 12.6% this quarter');
    });

    it('names the largest expense category with its share', () => {
      const [insight] = buildInsights(
        data({
          total_expenses: 1000,
          expense_breakdown: [
            { category: 'Fuel', amount: 250, percentage: 25 },
            { category: 'Materials', amount: 600, percentage: 60 },
            { category: 'Tools', amount: 150, percentage: 15 },
          ],
        }),
        fmt
      );
      expect(insight.key).toBe('top-expense');
      expect(insight.text).toBe('Materials is 60% of your costs');
      expect(insight.sub).toBe('£600 of £1,000');
    });

    it('omits the expense line when the breakdown is empty', () => {
      const keys = buildInsights(
        data({ total_expenses: 0, expense_breakdown: [] }),
        fmt
      ).map((i) => i.key);
      expect(keys).not.toContain('top-expense');
    });

    it('orders money-owed insights before trend commentary', () => {
      const keys = buildInsights(
        data({
          escrow_in_flight: 100,
          overdue_amount: 50,
          quarterly_growth: 10,
          total_expenses: 200,
          expense_breakdown: [
            { category: 'Fuel', amount: 200, percentage: 100 },
          ],
        }),
        fmt
      ).map((i) => i.key);
      expect(keys).toEqual(['escrow', 'overdue', 'growth', 'top-expense']);
    });
  });

  describe('rendering', () => {
    it('renders nothing at all when there are no insights', () => {
      const { toJSON } = render(
        <FinancialInsights financialData={emptyData} formatCurrency={fmt} />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders the card and its rows when there is something to say', () => {
      const { getByText } = render(
        <FinancialInsights
          financialData={data({ escrow_in_flight: 3.98, overdue_amount: 20 })}
          formatCurrency={fmt}
        />
      );
      expect(getByText('Insights')).toBeTruthy();
      expect(getByText('£3.98 waiting on approval')).toBeTruthy();
      expect(getByText('£20 in overdue invoices')).toBeTruthy();
    });

    it('never shows the fabricated bulk-purchasing tip', () => {
      // Guard: this was hardcoded and shown to every contractor.
      const { queryByText } = render(
        <FinancialInsights
          financialData={data({
            quarterly_growth: 25,
            overdue_amount: 100,
            escrow_in_flight: 100,
          })}
          formatCurrency={fmt}
        />
      );
      expect(queryByText(/Bulk purchasing/i)).toBeNull();
      expect(queryByText(/Negotiate better supplier rates/i)).toBeNull();
      expect(queryByText(/Keep up the momentum/i)).toBeNull();
    });

    it('does not crash on a summary missing the optional fields', () => {
      expect(() =>
        render(
          <FinancialInsights financialData={emptyData} formatCurrency={fmt} />
        )
      ).not.toThrow();
    });
  });
});
