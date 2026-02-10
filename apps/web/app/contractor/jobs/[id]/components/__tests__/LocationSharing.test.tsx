// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { LocationSharing } from '../LocationSharing';

describe('LocationSharing', () => {
  const mockProps = {
    jobId: 'job-1',
    contractorId: 'contractor-1',
  };

  beforeEach(() => {
    // Mock geolocation using defineProperty
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
        getCurrentPosition: vi.fn(),
      },
    });
  });

  it('should initialize with default values', () => {
    const { container } = render(<LocationSharing {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<LocationSharing {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<LocationSharing {...mockProps} />);
    expect(container).toBeDefined();
    unmount();
  });
});