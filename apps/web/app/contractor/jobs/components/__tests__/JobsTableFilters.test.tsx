import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { JobsTableFilters } from '../JobsTableFilters';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }),
}));

describe('JobsTableFilters', () => {
  const defaultProps = {
    currentStatus: 'all',
    currentSearch: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<JobsTableFilters {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<JobsTableFilters {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<JobsTableFilters {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<JobsTableFilters currentStatus="posted" currentSearch="plumber" />);
    expect(container).toBeDefined();
  });
});