import React from 'react';
import { render } from '../../../test-utils';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('should initialize with default values', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle updates correctly', () => {
    const { rerender, toJSON } = render(<Skeleton />);
    rerender(<Skeleton animate={false} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should clean up on unmount', () => {
    const { unmount, toJSON } = render(<Skeleton />);
    unmount();
    expect(toJSON()).toBeNull();
  });
});
