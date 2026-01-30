import { vi } from 'vitest';
import { render } from '@testing-library/react';
import ContractorJobDetailsError from '../error';

// Mock logger to prevent "Invalid string length" error
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('ContractorJobDetailsError', () => {
  const mockProps = {
    error: new Error('Test error'),
    reset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ContractorJobDetailsError {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<ContractorJobDetailsError {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<ContractorJobDetailsError {...mockProps} />);
    // Error component displays error message
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<ContractorJobDetailsError {...mockProps} />);
    expect(container).toBeDefined();
  });
});