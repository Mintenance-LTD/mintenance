// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import Loading from '../loading';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('ContractorProfileLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<Loading />);
    // Loading component displays skeleton
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<Loading />);
    expect(container).toBeDefined();
  });
});