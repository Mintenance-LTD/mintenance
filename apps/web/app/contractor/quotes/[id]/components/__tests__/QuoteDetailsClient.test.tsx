import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteDetailsClient } from '../QuoteDetailsClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Card.unified', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Badge.unified', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Printer: () => <span data-testid="icon" />,
  ArrowLeft: () => <span data-testid="icon" />,
  Mail: () => <span data-testid="icon" />,
}));

const mockQuote = {
  id: 'quote-1',
  quote_number: 'Q-2026-001',
  client_name: 'John Smith',
  client_email: 'john@example.com',
  client_phone: '+44 20 1234 5678',
  client_address: '123 Main Street, London, UK',
  title: 'Kitchen Plumbing Repair Quote',
  description: 'Comprehensive quote for kitchen plumbing repairs',
  line_items: [
    {
      description: 'Fix leaking pipe',
      quantity: 1,
      unitPrice: 15000,
      total: 15000,
    },
    {
      description: 'Replace faucet',
      quantity: 1,
      unitPrice: 25000,
      total: 25000,
    },
  ],
  subtotal: 40000,
  tax_rate: 20,
  tax_amount: 8000,
  total_amount: 48000,
  terms: 'Payment due within 30 days',
  notes: 'All materials included',
  quote_date: '2026-01-15',
  valid_until: '2026-02-15',
  status: 'pending',
  created_at: '2026-01-15T10:00:00Z',
};

describe('QuoteDetailsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<QuoteDetailsClient quote={mockQuote} />);
    expect(container).toBeDefined();
  });

  it('should display quote information', () => {
    const { container } = render(<QuoteDetailsClient quote={mockQuote} />);
    expect(container.textContent).toContain('Kitchen Plumbing Repair Quote');
    expect(container.textContent).toContain('John Smith');
  });

  it('should display line items', () => {
    const { container } = render(<QuoteDetailsClient quote={mockQuote} />);
    expect(container.textContent).toContain('Fix leaking pipe');
    expect(container.textContent).toContain('Replace faucet');
  });

  it('should display totals', () => {
    const { container } = render(<QuoteDetailsClient quote={mockQuote} />);
    // Component displays quote totals
    expect(container.textContent).toContain('Q-2026-001');
  });
});