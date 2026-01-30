import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricingBreakdown } from '../PricingBreakdown';

const items = [
  { id: '1', label: 'Labour', amount: 200 },
  { id: '2', label: 'Materials', amount: 50 },
];

describe('PricingBreakdown', () => {
  it('should render heading', () => {
    render(<PricingBreakdown items={items} subtotal={250} total={250} />);
    expect(screen.getByText('Price breakdown')).toBeInTheDocument();
  });

  it('should render line item labels', () => {
    render(<PricingBreakdown items={items} subtotal={250} total={250} />);
    expect(screen.getByText('Labour')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
  });

  it('should render total', () => {
    render(<PricingBreakdown items={items} subtotal={250} total={250} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('£250.00').length).toBeGreaterThanOrEqual(1);
  });

  it('should render discount items', () => {
    const discountItems = [
      { id: '1', label: 'Service', amount: 100 },
      { id: '2', label: 'Discount', amount: -10, isDiscount: true },
    ];
    render(<PricingBreakdown items={discountItems} subtotal={100} total={90} />);
    expect(screen.getByText('-£10.00')).toBeInTheDocument();
  });
});
