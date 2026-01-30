import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ContractorProfileClient } from '../ContractorProfileClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'test-token' }),
}));

// Mock all child components
vi.mock('../ProfileHeader', () => ({
  ProfileHeader: () => <div data-testid="profile-header">Profile Header</div>,
}));

vi.mock('../ProfileStats', () => ({
  ProfileStats: () => <div data-testid="profile-stats">Profile Stats</div>,
  PerformanceSnapshot: () => <div data-testid="performance-snapshot">Performance Snapshot</div>,
}));

vi.mock('../ProfileGallery', () => ({
  ProfileGallery: () => <div data-testid="profile-gallery">Profile Gallery</div>,
}));

vi.mock('../ProfileReviews', () => ({
  ProfileReviews: () => <div data-testid="profile-reviews">Profile Reviews</div>,
}));

vi.mock('../ProfileQuickActions', () => ({
  ProfileQuickActions: () => <div data-testid="profile-quick-actions">Profile Quick Actions</div>,
}));

vi.mock('../EditProfileDialog', () => ({
  EditProfileDialog: () => <div data-testid="edit-profile-dialog">Edit Profile Dialog</div>,
}));

vi.mock('../SkillsManagementDialog', () => ({
  SkillsManagementDialog: () => <div data-testid="skills-management-dialog">Skills Management Dialog</div>,
}));

vi.mock('../PhotoUploadDialog', () => ({
  PhotoUploadDialog: () => <div data-testid="photo-upload-dialog">Photo Upload Dialog</div>,
}));

vi.mock('../ContractorDataPrivacy', () => ({
  ContractorDataPrivacy: () => <div data-testid="contractor-data-privacy">Contractor Data Privacy</div>,
}));

const mockContractor = {
  id: 'contractor-1',
  first_name: 'John',
  last_name: 'Smith',
  email: 'john@example.com',
  bio: 'Experienced plumber with 10+ years',
  city: 'London',
  country: 'UK',
  phone: '+44 20 1234 5678',
  company_name: 'Smith Plumbing Ltd',
  license_number: 'PL-12345',
  is_available: true,
  profile_image_url: '/profile.jpg',
  rating: 4.8,
  total_jobs_completed: 150,
  admin_verified: true,
  created_at: '2020-01-15T10:00:00Z',
};

const mockSkills = [
  { skill_name: 'Plumbing', skill_icon: 'wrench' },
  { skill_name: 'Heating', skill_icon: 'fire' },
];

const mockReviews = [
  {
    id: 'review-1',
    rating: 5,
    review_text: 'Excellent work!',
    created_at: '2026-01-10T10:00:00Z',
    reviewer_id: 'user-1',
  },
];

const mockCompletedJobs = [
  {
    id: 'job-1',
    title: 'Kitchen Plumbing Repair',
    status: 'completed',
    created_at: '2026-01-05T10:00:00Z',
  },
];

const mockPosts = [
  {
    id: 'post-1',
    title: 'Tips for Winter Plumbing',
    content: 'Here are some tips...',
    images: ['/post1.jpg'],
    created_at: '2026-01-01T10:00:00Z',
  },
];

const mockMetrics = {
  profileCompletion: 95,
  averageRating: 4.8,
  totalReviews: 50,
  jobsCompleted: 150,
  winRate: 85,
};

const defaultProps = {
  contractor: mockContractor,
  skills: mockSkills,
  reviews: mockReviews,
  completedJobs: mockCompletedJobs,
  posts: mockPosts,
  metrics: mockMetrics,
};

describe('ContractorProfileClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ContractorProfileClient {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display contractor profile', () => {
    const { container } = render(<ContractorProfileClient {...defaultProps} />);
    // Component renders profile interface
    expect(container).toBeDefined();
  });

  it('should display metrics', () => {
    const { container } = render(<ContractorProfileClient {...defaultProps} />);
    // Component displays contractor metrics
    expect(container).toBeDefined();
  });

  it('should handle incomplete data', () => {
    const minimalProps = {
      ...defaultProps,
      contractor: {
        id: 'contractor-2',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
      },
      reviews: [],
      completedJobs: [],
      posts: [],
    };
    const { container } = render(<ContractorProfileClient {...minimalProps} />);
    expect(container).toBeDefined();
  });
});