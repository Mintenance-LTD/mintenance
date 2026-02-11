import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { TouchButton } from '../TouchButton';

vi.mock('../Touchable', () => ({
  TouchableButton: ({ children, onPress, disabled, 'aria-label': ariaLabel, 'data-testid': testId, ...props }: any) => (
    <button onClick={onPress} disabled={disabled} aria-label={ariaLabel} data-testid={testId}>{children}</button>
  ),
}));

describe('TouchButton', () => {
  it('should render children', () => {
    render(<TouchButton>Click Me</TouchButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should render with default variant and size', () => {
    const { container } = render(<TouchButton>Default</TouchButton>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should hide children when loading', () => {
    render(<TouchButton loading>Submit</TouchButton>);
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('should apply aria-label', () => {
    render(<TouchButton aria-label="Close dialog">X</TouchButton>);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });
});
