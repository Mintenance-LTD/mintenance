import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should display message when provided', () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should not display message when not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.firstChild).toBeInTheDocument();
    rerender(<LoadingSpinner size="lg" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
