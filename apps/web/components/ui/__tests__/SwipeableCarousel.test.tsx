import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableCarousel } from '../SwipeableCarousel';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', white: '#FFF', textSecondary: '#9CA3AF', surface: '#FFF' },
    spacing: { 2: '8px', 3: '12px', 4: '16px' },
    borderRadius: { full: '9999px' },
    shadows: { md: '0 4px 6px rgba(0,0,0,0.1)' },
  },
}));

const slides = [
  <div key="1">Slide 1</div>,
  <div key="2">Slide 2</div>,
  <div key="3">Slide 3</div>,
];

describe('SwipeableCarousel', () => {
  it('should render first slide', () => {
    render(<SwipeableCarousel>{slides}</SwipeableCarousel>);
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
  });

  it('should render navigation arrows by default', () => {
    render(<SwipeableCarousel>{slides}</SwipeableCarousel>);
    expect(screen.getByLabelText(/next/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prev/i)).toBeInTheDocument();
  });

  it('should navigate to next slide when arrow is clicked', () => {
    render(<SwipeableCarousel>{slides}</SwipeableCarousel>);
    fireEvent.click(screen.getByLabelText(/next/i));
    expect(screen.getByText('Slide 2')).toBeInTheDocument();
  });

  it('should render dots when showDots is true', () => {
    const { container } = render(<SwipeableCarousel showDots>{slides}</SwipeableCarousel>);
    expect(container.firstChild).toBeInTheDocument();
  });
});
