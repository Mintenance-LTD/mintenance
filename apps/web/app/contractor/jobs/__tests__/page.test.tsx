import { render, screen } from '@testing-library/react';
import ContractorJobsPage2025 from '../page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/contractor/jobs',
  }),
}));

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'contractor-1', role: 'contractor' },
    loading: false,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
  ErrorView: ({ message }: { message: string }) => <div data-testid="error-view">{message}</div>,
}));

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionArticle: ({ children }: { children: React.ReactNode }) => <article>{children}</article>,
  MotionDiv: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ContractorJobsPage2025', () => {
  it('should render the jobs page', () => {
    const { container } = render(<ContractorJobsPage2025 />);
    expect(container).toBeDefined();
  });

  it('should show loading spinner initially', () => {
    render(<ContractorJobsPage2025 />);
    // The page will show loading initially while fetching jobs
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});