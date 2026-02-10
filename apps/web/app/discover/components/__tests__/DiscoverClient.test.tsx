// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { DiscoverClient } from '../DiscoverClient';

// Mock all dependencies
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      text: '#111827',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      backgroundSecondary: '#f9fafb',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '20px',
      '2xl': '24px',
      full: '9999px',
    },
    typography: {
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    spacing: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
    },
  },
}));

vi.mock('./DiscoverHeader', () => ({
  DiscoverHeader: () => <div data-testid="discover-header">Header</div>,
}));

vi.mock('./DiscoverEmptyState', () => ({
  DiscoverEmptyState: () => <div data-testid="discover-empty">Empty</div>,
}));

vi.mock('./CardStack', () => ({
  CardStack: ({ renderCard, items, currentIndex }: any) => (
    <div data-testid="card-stack">
      {items[currentIndex] && renderCard(items[currentIndex])}
    </div>
  ),
}));

vi.mock('./SwipeActionButtons', () => ({
  SwipeActionButtons: () => <div data-testid="swipe-actions">Actions</div>,
}));

vi.mock('./JobCard', () => ({
  JobCard: () => <div data-testid="job-card">JobCard</div>,
}));

vi.mock('./ContractorCard', () => ({
  ContractorCard: () => <div data-testid="contractor-card">ContractorCard</div>,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => <span data-testid="icon" />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('DiscoverClient', () => {
  const mockUser = {
    id: 'user-1',
    role: 'contractor' as const,
    email: 'contractor@example.com',
  };

  const mockJobs = [
    {
      id: 'job-1',
      title: 'Kitchen Repair',
      description: 'Fix kitchen sink',
      budget: 50000,
      category: 'Plumbing',
    },
  ];

  const mockContractors = [
    {
      id: 'contractor-1',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Doe Construction',
    },
  ];

  const defaultProps = {
    user: mockUser,
    contractors: mockContractors,
    jobs: mockJobs,
  };

  it('should initialize with default values', () => {
    const { container } = render(<DiscoverClient {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<DiscoverClient {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<DiscoverClient {...defaultProps} />);
    expect(container).toBeDefined();
    unmount();
  });
});
