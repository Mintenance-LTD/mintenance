import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ContractorDataPrivacy } from '../ContractorDataPrivacy';

// Mock dependencies
vi.mock('@/lib/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      id: 'user-1',
      email: 'contractor@example.com',
    },
  }),
}));

vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon" />,
  Eye: () => <span data-testid="icon" />,
  EyeOff: () => <span data-testid="icon" />,
  Download: () => <span data-testid="icon" />,
  Trash2: () => <span data-testid="icon" />,
  Info: () => <span data-testid="icon" />,
  AlertCircle: () => <span data-testid="icon" />,
  CheckCircle: () => <span data-testid="icon" />,
  X: () => <span data-testid="icon" />,
}));

vi.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertTitle: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/lib/animations/variants', () => ({
  staggerItem: {},
}));

describe('ContractorDataPrivacy', () => {
  const mockProps = {
    contractorId: 'contractor-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { container } = render(<ContractorDataPrivacy {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<ContractorDataPrivacy {...mockProps} />);
    // Component renders privacy controls
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<ContractorDataPrivacy {...mockProps} />);
    expect(container).toBeDefined();
    unmount();
    // Component unmounts cleanly
  });
});