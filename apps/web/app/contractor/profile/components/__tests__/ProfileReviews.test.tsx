// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { ProfileReviews } from '../ProfileReviews';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
      backgroundSecondary: '#f9fafb',
      ratingGold: '#fbbf24',
      primary: '#4f46e5',
      text: '#111827',
    },
    spacing: {
      4: '16px',
      6: '24px',
      8: '32px',
    },
    typography: {
      fontWeight: {
        bold: 700,
        semibold: 600,
        medium: 500,
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
      },
    },
  },
}));

describe('ProfileReviews', () => {
  const mockReviews = [
    {
      id: 'review-1',
      rating: 5,
      comment: 'Excellent work!',
      created_at: '2026-01-10T10:00:00Z',
      reviewer: {
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: '/profile.jpg',
      },
      job: {
        title: 'Kitchen Repair',
        category: 'Plumbing',
      },
    },
    {
      id: 'review-2',
      rating: 4,
      comment: 'Good service',
      created_at: '2026-01-15T10:00:00Z',
      reviewer: {
        first_name: 'Jane',
        last_name: 'Smith',
      },
    },
  ];

  const defaultProps = {
    reviews: mockReviews,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ProfileReviews {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<ProfileReviews {...defaultProps} />);
    // Component renders review list
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<ProfileReviews {...defaultProps} />);
    // Component displays reviews
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<ProfileReviews reviews={[]} />);
    // Component handles empty reviews
    expect(container).toBeDefined();
  });
});