'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { formatCurrency } from './contractHelpers';
import type { ContractQuote } from './useContractData';

/**
 * Renders the contractor's full quote breakdown that was submitted
 * with their bid (line items, subtotal, VAT, total, plus the
 * contractor's own terms text).
 *
 * 2026-05-13 bid → contract pipeline audit fix: every bid already
 * created a `contractor_quotes` row, and `contracts.quote_id` already
 * existed in the schema, but the contract UI never surfaced any of
 * that — homeowners signed off on a contract that just listed a flat
 * `amount` number. Now the breakdown the contractor itemised is
 * visible at the signature step.
 *
 * Renders nothing if no line items / tax / terms exist, so manually-
 * created contracts (the contractor's CreateContractDialog flow that
 * doesn't always carry a quote) collapse cleanly.
 */
export function ContractQuoteBreakdown({
  quote,
}: {
  quote: ContractQuote | null | undefined;
}) {
  if (!quote) return null;

  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
  const hasLineItems = lineItems.length > 0;
  const hasTax = typeof quote.tax_amount === 'number' && quote.tax_amount > 0;
  const hasTerms =
    typeof quote.terms === 'string' && quote.terms.trim().length > 0;

  if (!hasLineItems && !hasTax && !hasTerms) {
    return null;
  }

  return (
    <div>
      <div className='flex items-center gap-2 mb-3'>
        <Receipt className='w-4 h-4 text-teal-600' />
        <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
          Contractor's Quote
        </h4>
        {quote.quote_number ? (
          <span className='text-[10px] text-gray-300 ml-auto'>
            #{quote.quote_number}
          </span>
        ) : null}
      </div>

      <div className='border border-gray-100 rounded-xl p-4 space-y-3'>
        {hasLineItems ? (
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='text-gray-400 border-b border-gray-100'>
                  <th className='text-left font-medium uppercase tracking-wider py-2'>
                    Item
                  </th>
                  <th className='text-right font-medium uppercase tracking-wider py-2 w-12'>
                    Qty
                  </th>
                  <th className='text-right font-medium uppercase tracking-wider py-2 w-20'>
                    Unit £
                  </th>
                  <th className='text-right font-medium uppercase tracking-wider py-2 w-24'>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr
                    key={`${item.description}-${idx}`}
                    className='border-b border-gray-50 last:border-b-0'
                  >
                    <td className='py-2 text-gray-700'>
                      <span className='whitespace-pre-wrap'>
                        {item.description || '—'}
                      </span>
                      {item.type ? (
                        <span className='ml-2 text-[10px] uppercase tracking-wider text-gray-300'>
                          {item.type}
                        </span>
                      ) : null}
                    </td>
                    <td className='py-2 text-right text-gray-600'>
                      {item.quantity}
                    </td>
                    <td className='py-2 text-right text-gray-600'>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className='py-2 text-right font-medium text-gray-800'>
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {(hasLineItems || hasTax) && (
          <div className='space-y-1.5 pt-2 border-t border-gray-100'>
            {typeof quote.subtotal === 'number' && (
              <div className='flex justify-between text-xs text-gray-500'>
                <span>Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
            )}
            {hasTax && (
              <div className='flex justify-between text-xs text-gray-500'>
                <span>
                  VAT
                  {typeof quote.tax_rate === 'number' && quote.tax_rate > 0
                    ? ` (${quote.tax_rate}%)`
                    : ''}
                </span>
                <span>{formatCurrency(quote.tax_amount ?? 0)}</span>
              </div>
            )}
            {typeof quote.total_amount === 'number' && (
              <div className='flex justify-between text-sm font-semibold text-gray-900 pt-1'>
                <span>Quote Total</span>
                <span>{formatCurrency(quote.total_amount)}</span>
              </div>
            )}
          </div>
        )}

        {hasTerms ? (
          <div className='pt-3 border-t border-gray-100'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5'>
              Contractor's Terms
            </p>
            <p className='text-xs text-gray-600 whitespace-pre-wrap leading-relaxed'>
              {quote.terms}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
