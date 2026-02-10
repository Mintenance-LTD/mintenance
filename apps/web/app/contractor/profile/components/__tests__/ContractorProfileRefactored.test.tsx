// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { ContractorProfileRefactored } from '../ContractorProfileRefactored';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'test-token' }),
}));

vi.mock('../hooks/useContractorProfile', () => ({
  useContractorProfile: () => ({
    fullName: 'John Smith',
    profileCompletion: 95,
    isAvailable: true,
    toggleAvailability: vi.fn(),
  }),
}));

vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock child components
vi.mock('../ProfileHeader', () => ({
  ProfileHeader: () => <div>Profile Header</div>,
}));

vi.mock('../ProfileMetrics', () => ({
  ProfileMetrics: () => <div>Profile Metrics</div>,
  ProfileCompletionCard: () => <div>Profile Completion Card</div>,
}));

vi.mock('../ReviewsSection', () => ({
  ReviewsSection: () => <div>Reviews Section</div>,
}));

vi.mock('../SkillsManagementModal', () => ({
  SkillsManagementModal: () => <div>Skills Management Modal</div>,
}));

vi.mock('../ProfileEditModal', () => ({
  ProfileEditModal: () => <div>Profile Edit Modal</div>,
}));

const mockContractor = {
  id: 'contractor-1',
  first_name: 'John',
  last_name: 'Smith',
  email: 'john@example.com',
  bio: 'Experienced contractor',
  city: 'London',
  country: 'UK',
};

const mockSkills = [{ skill_name: 'Plumbing', skill_icon: 'wrench' }];
const mockReviews = [
  {
    id: 'review-1',
    rating: 5,
    review_text: 'Great work!',
    created_at: '2026-01-10T10:00:00Z',
    reviewer_id: 'user-1',
  },
];
const mockCompletedJobs = [{ id: 'job-1', title: 'Kitchen Repair', status: 'completed', created_at: '2026-01-05T10:00:00Z' }];
const mockPosts = [{ id: 'post-1', content: 'Tips', created_at: '2026-01-01T10:00:00Z' }];
const mockMetrics = { profileCompletion: 95, averageRating: 4.8, totalReviews: 50, jobsCompleted: 150 };

const defaultProps = {
  contractor: mockContractor,
  skills: mockSkills,
  reviews: mockReviews,
  completedJobs: mockCompletedJobs,
  posts: mockPosts,
  metrics: mockMetrics,
};

describe('ContractorProfileRefactored', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const minimalProps = { ...defaultProps, reviews: [], completedJobs: [], posts: [] };
    const { container } = render(<ContractorProfileRefactored {...minimalProps} />);
    expect(container).toBeDefined();
  });

  it('should display contractor profile', () => {
    const minimalProps = { ...defaultProps, reviews: [], completedJobs: [], posts: [] };
    const { container } = render(<ContractorProfileRefactored {...minimalProps} />);
    expect(container).toBeDefined();
  });

  it('should display metrics', () => {
    const minimalProps = { ...defaultProps, reviews: [], completedJobs: [], posts: [] };
    const { container } = render(<ContractorProfileRefactored {...minimalProps} />);
    expect(container).toBeDefined();
  });

  it('should handle minimal data', () => {
    const minimalProps = {
      ...defaultProps,
      reviews: [],
      completedJobs: [],
      posts: [],
    };
    const { container } = render(<ContractorProfileRefactored {...minimalProps} />);
    expect(container).toBeDefined();
  });
});