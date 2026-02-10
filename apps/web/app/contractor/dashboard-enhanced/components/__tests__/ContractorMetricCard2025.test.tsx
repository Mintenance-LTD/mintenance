// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { ContractorMetricCard2025 } from '../ContractorMetricCard2025';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/charts', () => ({
  DynamicAreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ContractorMetricCard2025', () => {
  const mockProps = {
    title: 'Total Revenue',
    value: '£120,000',
    subtitle: 'This month',
    trend: {
      value: '+15%',
      direction: 'up' as const,
    },
    color: 'teal' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ContractorMetricCard2025 {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should display title and value', () => {
    render(<ContractorMetricCard2025 {...mockProps} />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('£120,000')).toBeInTheDocument();
  });

  it('should display trend information', () => {
    const { container } = render(<ContractorMetricCard2025 {...mockProps} />);
    expect(container.textContent).toContain('+15%');
  });

  it('should render with minimal props', () => {
    const minimalProps = {
      title: 'Active Jobs',
      value: 5,
    };
    const { container } = render(<ContractorMetricCard2025 {...minimalProps} />);
    expect(container.textContent).toContain('Active Jobs');
    expect(container.textContent).toContain('5');
  });
});
