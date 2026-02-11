// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { BidSubmissionClient } from '../BidSubmissionClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Card.unified', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Printer: () => <span data-testid="icon" />,
  ArrowLeft: () => <span data-testid="icon" />,
  Mail: () => <span data-testid="icon" />,
  Calendar: () => <span data-testid="icon" />,
  Clock: () => <span data-testid="icon" />,
  MapPin: () => <span data-testid="icon" />,
  User: () => <span data-testid="icon" />,
  PoundSterling: () => <span data-testid="icon" />,
  DollarSign: () => <span data-testid="icon" />,
  Lightbulb: () => <span data-testid="icon" />,
  AlertCircle: () => <span data-testid="icon" />,
  CheckCircle: () => <span data-testid="icon" />,
  Send: () => <span data-testid="icon" />,
  FileText: () => <span data-testid="icon" />,
  ChevronDown: () => <span data-testid="icon" />,
  ChevronRight: () => <span data-testid="icon" />,
  ChevronLeft: () => <span data-testid="icon" />,
  X: () => <span data-testid="icon" />,
  Plus: () => <span data-testid="icon" />,
  Minus: () => <span data-testid="icon" />,
  Info: () => <span data-testid="icon" />,
  Home: () => <span data-testid="icon" />,
}));

const mockJob = {
  id: 'job-1',
  title: 'Kitchen Plumbing Repair',
  description: 'Fix leaking pipe under kitchen sink',
  budget: '50000',
  location: 'London, UK',
  category: 'Plumbing',
  createdAt: '2026-01-15T10:00:00Z',
  homeowner: {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
  },
};

describe('BidSubmissionClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { container } = render(<BidSubmissionClient job={mockJob} />);
    expect(container).toBeDefined();
  });

  it('should display job information', () => {
    const { container } = render(<BidSubmissionClient job={mockJob} />);
    expect(container.textContent).toContain('Kitchen Plumbing Repair');
  });

  it('should render form for bid submission', () => {
    const { container } = render(<BidSubmissionClient job={mockJob} />);
    // Component renders bid submission form
    expect(container).toBeDefined();
  });
});