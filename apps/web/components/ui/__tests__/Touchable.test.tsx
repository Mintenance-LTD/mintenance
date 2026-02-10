import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent } from '@testing-library/react';
import { Touchable } from '../Touchable';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488' },
    spacing: {},
  },
}));

describe('Touchable', () => {
  it('should render children', () => {
    render(<Touchable><span>Touch me</span></Touchable>);
    expect(screen.getByText('Touch me')).toBeInTheDocument();
  });

  it('should call onPress on mouseUp', () => {
    const onPress = vi.fn();
    render(<Touchable onPress={onPress}><span>Press</span></Touchable>);
    const el = screen.getByText('Press').closest('[role="button"]') || screen.getByText('Press').parentElement!;
    fireEvent.mouseDown(el);
    fireEvent.mouseUp(el);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = vi.fn();
    render(<Touchable onPress={onPress} disabled><span>Disabled</span></Touchable>);
    const el = screen.getByText('Disabled').closest('[role="button"]') || screen.getByText('Disabled').parentElement!;
    fireEvent.mouseDown(el);
    fireEvent.mouseUp(el);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should apply aria-label', () => {
    render(<Touchable aria-label="action button"><span>Action</span></Touchable>);
    expect(screen.getByLabelText('action button')).toBeInTheDocument();
  });

  it('should apply data-testid', () => {
    render(<Touchable data-testid="touchable-1"><span>Test</span></Touchable>);
    expect(screen.getByTestId('touchable-1')).toBeInTheDocument();
  });
});
