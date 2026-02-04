import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingTable } from '../PricingTable';

vi.mock('./Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const plans = [
  { id: 'basic', name: 'Basic', price: 10, features: ['5 jobs', 'Email support'] },
  { id: 'pro', name: 'Professional', price: 25, features: ['Unlimited jobs', 'Priority support'], recommended: true },
];

describe('PricingTable', () => {
  it('should render plan names', () => {
    render(<PricingTable plans={plans} />);
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('should render features', () => {
    render(<PricingTable plans={plans} />);
    expect(screen.getByText('5 jobs')).toBeInTheDocument();
    expect(screen.getByText('Unlimited jobs')).toBeInTheDocument();
  });

  it('should render recommended badge', () => {
    render(<PricingTable plans={plans} />);
    expect(screen.getByText('RECOMMENDED')).toBeInTheDocument();
  });

  it('should call onSelectPlan when plan is selected', () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable plans={plans} onSelectPlan={onSelectPlan} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelectPlan).toHaveBeenCalled();
  });
});
