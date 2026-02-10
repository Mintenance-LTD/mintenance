import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { EmptyStateEducational } from '../EmptyStateEducational';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@mintenance/design-tokens/src/unified-tokens', () => ({
  unifiedTokens: { colors: { primary: { 600: '#0D9488' }, gray: { 50: '#F9FAFB', 600: '#4B5563', 900: '#111827' } } },
}));

describe('EmptyStateEducational', () => {
  it('should render jobs empty state', () => {
    render(<EmptyStateEducational type="jobs" />);
    expect(screen.getByText('No jobs posted yet')).toBeInTheDocument();
  });

  it('should render messages empty state', () => {
    render(<EmptyStateEducational type="messages" />);
    expect(screen.getByText(/no.*message/i)).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    const { container } = render(<EmptyStateEducational type="jobs" className="custom-class" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
