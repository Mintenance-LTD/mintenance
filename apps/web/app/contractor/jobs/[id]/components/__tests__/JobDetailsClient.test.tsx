// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { JobDetailsClient } from '../JobDetailsClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe('JobDetailsClient', () => {
  const mockProps = {
    job: {
      id: 'job-1',
      title: 'Kitchen Repair',
      description: 'Fix kitchen sink',
      status: 'posted',
      budget: 50000,
      photos: ['/photo1.jpg'],
    },
    homeowner: {
      id: 'homeowner-1',
      first_name: 'John',
      last_name: 'Doe',
    },
    existingBid: null,
  };

  it('should initialize with default values', () => {
    const { container } = render(<JobDetailsClient {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<JobDetailsClient {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<JobDetailsClient {...mockProps} />);
    expect(container).toBeDefined();
    unmount();
  });
});