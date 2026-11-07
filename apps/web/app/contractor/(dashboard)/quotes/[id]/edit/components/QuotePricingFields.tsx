'use client';

import React from 'react';
import {
  calculateDraftQuotePricing,
  type DraftQuotePricing,
} from '@mintenance/shared';

export interface EditableQuoteItem {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

export function readQuotePricing(
  items: EditableQuoteItem[],
  tax: string
): DraftQuotePricing {
  const decimal = (value: string, places: number, label: string) => {
    if (!new RegExp(`^\\d+(\\.\\d{0,${places}})?$`).test(value.trim())) {
      throw new Error(`Enter ${label} using up to ${places} decimal places.`);
    }
    return Number(value);
  };
  const pricing = {
    line_items: items.map((item) => ({
      description: item.description,
      quantity: decimal(item.quantity, 3, 'a quantity'),
      unitPrice: decimal(item.unitPrice, 2, 'a unit price'),
    })),
    tax_rate_percent: decimal(tax, 2, 'the applicable tax percentage'),
  };
  calculateDraftQuotePricing(pricing);
  return pricing;
}

export function QuotePricingFields({
  items,
  tax,
  onItems,
  onTax,
  onAdd,
  preview,
  amendment = false,
}: {
  items: EditableQuoteItem[];
  tax: string;
  onItems: (items: EditableQuoteItem[]) => void;
  onTax: (value: string) => void;
  onAdd: () => void;
  preview?: ReturnType<typeof calculateDraftQuotePricing>;
  amendment?: boolean;
}) {
  const update = (
    key: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string
  ) =>
    onItems(
      items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  const fieldClass =
    'field w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <section
      aria-label={amendment ? 'Proposed pricing' : 'Draft pricing'}
      className='space-y-4'
    >
      <p>
        {amendment
          ? 'Saving records a separate proposal. The accepted price stays unchanged.'
          : 'Saving replaces this draft’s pricing with the breakdown below.'}{' '}
        Review every item, include agreed adjustments in the unit prices, and
        enter the applicable tax percentage (0 for no tax).
      </p>
      {items.map((item, index) => (
        <fieldset
          key={item.key}
          className='rounded-lg border border-slate-200 p-4 space-y-3'
        >
          <legend className='font-semibold'>Item {index + 1}</legend>
          <label className='block' htmlFor={`item-${item.key}-description`}>
            Description
          </label>
          <input
            id={`item-${item.key}-description`}
            aria-label={`Item ${index + 1} description`}
            value={item.description}
            onChange={(e) => update(item.key, 'description', e.target.value)}
            maxLength={500}
            className={fieldClass}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label htmlFor={`item-${item.key}-quantity`}>Quantity</label>
              <input
                id={`item-${item.key}-quantity`}
                aria-label={`Item ${index + 1} quantity`}
                value={item.quantity}
                onChange={(e) => update(item.key, 'quantity', e.target.value)}
                inputMode='decimal'
                maxLength={20}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={`item-${item.key}-price`}>
                Unit price (£, before tax)
              </label>
              <input
                id={`item-${item.key}-price`}
                aria-label={`Item ${index + 1} unit price`}
                value={item.unitPrice}
                onChange={(e) => update(item.key, 'unitPrice', e.target.value)}
                inputMode='decimal'
                maxLength={20}
                className={fieldClass}
              />
            </div>
          </div>
          {preview?.line_items[index] && (
            <p>Line total: £{preview.line_items[index].total.toFixed(2)}</p>
          )}
          <button
            type='button'
            aria-label={`Remove item ${index + 1}`}
            className='min-h-11 underline'
            onClick={() => onItems(items.filter((row) => row.key !== item.key))}
          >
            Remove item
          </button>
        </fieldset>
      ))}
      <button
        type='button'
        className='btn btn-secondary min-h-11'
        disabled={items.length >= 100}
        onClick={onAdd}
      >
        Add item
      </button>
      <div>
        <label htmlFor='quote-tax'>Tax (%)</label>
        <input
          id='quote-tax'
          value={tax}
          onChange={(e) => onTax(e.target.value)}
          inputMode='decimal'
          maxLength={6}
          className={fieldClass}
        />
      </div>
      {preview && (
        <div
          aria-live='polite'
          className='rounded-lg border border-slate-200 p-4 space-y-2'
        >
          <p>New subtotal: £{preview.subtotal.toFixed(2)}</p>
          <p>New tax: £{preview.tax_amount.toFixed(2)}</p>
          <p className='font-semibold'>
            New total: £{preview.total_amount.toFixed(2)}
          </p>
        </div>
      )}
    </section>
  );
}
