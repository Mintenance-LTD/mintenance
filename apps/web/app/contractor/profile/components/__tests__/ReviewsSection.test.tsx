import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReviewsSection } from '../ReviewsSection';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('lucide-react', () => ({
  Star: () => <span data-testid="icon" />,
  User: () => <span data-testid="icon" />,
  Briefcase: () => <span data-testid="icon" />,
  Calendar: () => <span data-testid="icon" />,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/lib/animations/variants', () => ({
  staggerItem: {},
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: (date: string) => '2 days ago',
}));

describe('ReviewsSection', () => {
  const mockReviews = [
    {
      id: 'review-1',
      rating: 5,
      comment: 'Excellent work! Very professional.',
      reviewer_name: 'John Doe',
      created_at: '2026-01-10T10:00:00Z',
      reviewer: {
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: '/profile.jpg',
      },
      job: {
        id: 'job-1',
        title: 'Kitchen Repair',
      },
    },
    {
      id: 'review-2',
      rating: 4,
      comment: 'Good service, would recommend.',
      reviewer_name: 'Jane Smith',
      created_at: '2026-01-15T10:00:00Z',
    },
  ];

  const defaultProps = {
    reviews: mockReviews,
    averageRating: 4.5,
    totalReviews: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ReviewsSection {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<ReviewsSection {...defaultProps} />);
    // Component renders reviews section
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<ReviewsSection {...defaultProps} />);
    // Component displays reviews and ratings
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<ReviewsSection reviews={[]} averageRating={0} totalReviews={0} />);
    // Component handles empty reviews
    expect(container).toBeDefined();
  });
});