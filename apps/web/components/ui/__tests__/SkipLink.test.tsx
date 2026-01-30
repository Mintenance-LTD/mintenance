import React from 'react';
import { render, screen } from '@testing-library/react';
import { SkipLink } from '../SkipLink';

describe('SkipLink', () => {
  it('should render with href and children', () => {
    render(<SkipLink href="#main-content">Skip to content</SkipLink>);
    const link = screen.getByText('Skip to content');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('should render as an anchor element', () => {
    render(<SkipLink href="#main">Skip</SkipLink>);
    expect(screen.getByText('Skip').tagName).toBe('A');
  });

  it('should have skip-link class', () => {
    const { container } = render(<SkipLink href="#main">Skip</SkipLink>);
    expect(container.querySelector('.skip-link')).toBeInTheDocument();
  });
});
