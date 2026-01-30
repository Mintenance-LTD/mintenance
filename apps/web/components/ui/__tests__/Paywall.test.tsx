import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Paywall } from '../Paywall';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('./Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('@/lib/feature-access-config', () => ({
  TIER_PRICING: {
    free: { name: 'Free', price: 0 },
    basic: { name: 'Basic', price: 10 },
    professional: { name: 'Professional', price: 25 },
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn() },
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  feature: {
    id: 'ai-search',
    name: 'AI Search',
    description: 'Search with AI',
    limits: { free: false, basic: 10, professional: 'unlimited' },
  },
  currentTier: 'free' as const,
  upgradeTiers: ['basic' as const, 'professional' as const],
};

describe('Paywall', () => {
  it('should render when isOpen is true', () => {
    render(<Paywall {...defaultProps} />);
    // Text "AI Search" is split across child elements in the heading
    expect(screen.getByText(/Unlock/)).toBeInTheDocument();
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
  });

  it('should return null when isOpen is false', () => {
    const { container } = render(<Paywall {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Paywall {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
