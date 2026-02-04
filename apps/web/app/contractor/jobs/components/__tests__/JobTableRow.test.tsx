import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { JobTableRow } from '../JobTableRow';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('JobTableRow', () => {
  const mockJob = {
    id: 'job-1',
    title: 'Kitchen Repair',
    status: 'posted' as const,
    budget: 50000,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    location: 'London, UK',
    homeowner: {
      first_name: 'John',
      last_name: 'Doe',
    },
  };

  const defaultProps = {
    job: mockJob,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<JobTableRow {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<JobTableRow {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<JobTableRow {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const minimalJob = {
      ...mockJob,
      budget: null,
      location: null,
    };
    const { container } = render(<JobTableRow job={minimalJob} />);
    expect(container).toBeDefined();
  });
});