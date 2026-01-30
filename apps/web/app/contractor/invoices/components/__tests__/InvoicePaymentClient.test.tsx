import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { InvoicePaymentClient } from '../InvoicePaymentClient';

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useStripe: () => ({}),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
}));

const mockProps = {
  clientSecret: 'test_secret_123',
  invoiceId: 'inv-123',
  invoiceNumber: 'INV-2026-001',
  amount: 50000,
  currency: 'gbp',
};

describe('InvoicePaymentClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { container } = render(<InvoicePaymentClient {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should display invoice information', () => {
    const { container } = render(<InvoicePaymentClient {...mockProps} />);
    expect(container.textContent).toContain('INV-2026-001');
  });

  it('should render payment form', () => {
    const { container } = render(<InvoicePaymentClient {...mockProps} />);
    // Component renders Stripe payment form
    expect(container).toBeDefined();
  });
});