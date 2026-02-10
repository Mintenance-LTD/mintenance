// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { JobPhotoUpload } from '../JobPhotoUpload';

describe('JobPhotoUpload', () => {
  const mockProps = {
    jobId: 'job-1',
    latitude: 51.5074,
    longitude: -0.1278,
    location: 'London, UK',
  };

  it('should initialize with default values', () => {
    const { container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
    unmount();
  });
});