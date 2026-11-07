/** Explicit replacement pricing for a draft. Rates are percentages, never fractions. */
export interface DraftQuotePricing {
  line_items: { description: string; quantity: number; unitPrice: number }[];
  tax_rate_percent: number;
}

const MAX_PENCE = 9_999_999_999; // contractor_quotes numeric(10,2)

function scaled(
  value: number,
  scale: number,
  max: number,
  label: string
): number {
  const integer = Math.round(value * scale);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    Math.abs(value * scale - integer) > 0.00001
  ) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return integer;
}

export function calculateDraftQuotePricing(pricing: DraftQuotePricing) {
  if (!pricing.line_items.length || pricing.line_items.length > 100) {
    throw new Error('Include between 1 and 100 line items.');
  }
  const rate = scaled(
    pricing.tax_rate_percent,
    100,
    100,
    'tax percentage (0–100, up to 2 decimal places)'
  );
  let subtotalPence = 0;
  const line_items = pricing.line_items.map((item) => {
    const description = item.description.trim();
    if (!description || description.length > 500) {
      throw new Error('Each item needs a description of up to 500 characters.');
    }
    const quantity = scaled(
      item.quantity,
      1000,
      1_000_000,
      'quantity (up to 3 decimal places)'
    );
    if (quantity === 0)
      throw new Error('Each quantity must be greater than zero.');
    const unitPence = scaled(
      item.unitPrice,
      100,
      1_000_000,
      'unit price (up to 2 decimal places)'
    );
    // Check before multiplication to keep all integer arithmetic within safe range.
    if (quantity > 0 && unitPence > (MAX_PENCE * 1000) / quantity) {
      throw new Error('The quote total must be below £100,000,000.');
    }
    const totalPence = Math.round((quantity * unitPence) / 1000);
    subtotalPence += totalPence;
    if (subtotalPence > MAX_PENCE) {
      throw new Error('The quote total must be below £100,000,000.');
    }
    return {
      description,
      quantity: item.quantity,
      unitPrice: unitPence / 100,
      total: totalPence / 100,
    };
  });
  const taxPence = Math.round((subtotalPence * rate) / 10_000);
  if (subtotalPence + taxPence > MAX_PENCE) {
    throw new Error('The quote total must be below £100,000,000.');
  }
  return {
    line_items,
    subtotal: subtotalPence / 100,
    tax_rate: rate / 100,
    tax_amount: taxPence / 100,
    total_amount: (subtotalPence + taxPence) / 100,
  };
}
