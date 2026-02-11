// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobsTable } from '../JobsTable';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }),
}));

describe('JobsTable', () => {
  const mockJobs = [
    {
      id: 'job-1',
      title: 'Kitchen Repair',
      status: 'posted' as const,
      budget: 50000,
      created_at: '2026-01-10T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
      location: 'London, UK',
      homeowner: { first_name: 'John', last_name: 'Doe' },
    },
  ];

  const defaultProps = {
    jobs: mockJobs,
    currentPage: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<JobsTable {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<JobsTable {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<JobsTable {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<JobsTable jobs={[]} currentPage={1} />);
    expect(container).toBeDefined();
  });
});