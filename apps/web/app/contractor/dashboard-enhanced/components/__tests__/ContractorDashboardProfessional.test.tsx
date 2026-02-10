// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { ContractorDashboardProfessional } from '../ContractorDashboardProfessional';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  Briefcase: () => <span data-testid="icon-briefcase" />,
  Clock: () => <span data-testid="icon-clock" />,
  Target: () => <span data-testid="icon-target" />,
  Eye: () => <span data-testid="icon-eye" />,
  PoundSterling: () => <span data-testid="icon-pound" />,
  CheckCircle: () => <span data-testid="icon-check" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Award: () => <span data-testid="icon-award" />,
  Zap: () => <span data-testid="icon-zap" />,
  FileText: () => <span data-testid="icon-file" />,
  Search: () => <span data-testid="icon-search" />,
  Upload: () => <span data-testid="icon-upload" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  BarChart3: () => <span data-testid="icon-chart" />,
  Activity: () => <span data-testid="icon-activity" />,
  Bot: () => <span data-testid="icon-bot" />,
  Settings: () => <span data-testid="icon-settings" />,
}));

vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ContractorDashboardProfessional', () => {
  const mockData = {
    contractor: {
      id: 'contractor-1',
      name: 'John Smith',
      company: 'Smith Plumbing',
      avatar: '/avatar.jpg',
      location: 'London, UK',
      email: 'john@example.com',
    },
    metrics: {
      totalRevenue: 120000,
      revenueChange: 15.5,
      activeJobs: 5,
      completedJobs: 23,
      pendingBids: 3,
      completionRate: 95.5,
      pendingEscrowAmount: 5000,
      pendingEscrowCount: 2,
    },
    progressTrendData: [
      { month: 'Jan', jobs: 10, completed: 9, revenue: 10000 },
      { month: 'Feb', jobs: 12, completed: 11, revenue: 12000 },
    ],
    recentJobs: [
      {
        id: 'job-1',
        title: 'Kitchen Renovation',
        status: 'in_progress',
        budget: 5000,
        progress: 60,
        category: 'Plumbing',
        priority: 'high',
        homeowner: 'Jane Doe',
        dueDate: '2026-02-01',
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        type: 'bid_accepted',
        message: 'Your bid was accepted',
        timestamp: '2026-01-25T10:00:00Z',
        isRead: false,
      },
    ],
    subscriptionInfo: {
      tier: 'professional' as const,
      bidsUsed: 5,
      bidsLimit: 20,
      bidsResetDate: '2026-02-01',
    },
    hasPaymentSetup: true,
    onboardingStatus: {
      stepsCompleted: 4,
      totalSteps: 5,
      isComplete: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ContractorDashboardProfessional data={mockData} />);
    expect(container).toBeDefined();
  });

  it('should display contractor company name', () => {
    render(<ContractorDashboardProfessional data={mockData} />);
    // Component shows company name in header
    expect(screen.getByText(/Smith Plumbing/i)).toBeInTheDocument();
  });

  it('should display metrics', () => {
    const { container } = render(<ContractorDashboardProfessional data={mockData} />);
    // Just verify the dashboard renders with metrics data
    expect(container.textContent).toContain('5'); // Active jobs somewhere in the dashboard
    expect(container.textContent).toContain('23'); // Completed jobs somewhere in the dashboard
  });

  it('should render with minimal data', () => {
    const minimalData = {
      ...mockData,
      recentJobs: [],
      notifications: [],
      subscriptionInfo: null,
      onboardingStatus: null,
    };
    const { container } = render(<ContractorDashboardProfessional data={minimalData} />);
    expect(container).toBeDefined();
  });
});
