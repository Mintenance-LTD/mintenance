import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorView } from '../ErrorView';

vi.mock('../Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('../Card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('ErrorView', () => {
  it('should render with default title and message', () => {
    render(<ErrorView />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an error/)).toBeInTheDocument();
  });

  it('should render custom title and message', () => {
    render(<ErrorView title="404 Not Found" message="Page missing" />);
    expect(screen.getByText('404 Not Found')).toBeInTheDocument();
    expect(screen.getByText('Page missing')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorView onRetry={onRetry} />);
    const button = screen.getByText('Try Again');
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button without onRetry', () => {
    render(<ErrorView />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should render custom retry label', () => {
    render(<ErrorView onRetry={() => {}} retryLabel="Reload" />);
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });
});
