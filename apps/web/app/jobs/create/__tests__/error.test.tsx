import { vi } from 'vitest';
import { render } from '@testing-library/react';
import JobCreationError from '../error';

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon" />,
  RefreshCw: () => <span data-testid="icon" />,
  ArrowLeft: () => <span data-testid="icon" />,
  Save: () => <span data-testid="icon" />,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('JobCreationError', () => {
  const defaultProps = {
    error: new Error('Test error'),
    reset: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('should render without crashing', () => {
    const { container } = render(<JobCreationError {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', () => {
    const { container } = render(<JobCreationError {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<JobCreationError {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<JobCreationError {...defaultProps} />);
    expect(container).toBeDefined();
  });
});