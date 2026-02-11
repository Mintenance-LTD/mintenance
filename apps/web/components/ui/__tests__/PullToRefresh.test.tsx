import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { PullToRefresh } from '../PullToRefresh';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', textSecondary: '#9CA3AF', surface: '#FFF', border: '#E5E7EB' },
    spacing: { 2: '8px', 3: '12px', 4: '16px' },
    borderRadius: { full: '9999px' },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)' },
    typography: { fontSize: { sm: '14px', md: '16px' }, fontWeight: { medium: 500, bold: 700 } },
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('PullToRefresh', () => {
  it('should render children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div>Content here</div>
      </PullToRefresh>
    );
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('should render pull text', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div>Child</div>
      </PullToRefresh>
    );
    expect(screen.getByText('Pull to refresh')).toBeInTheDocument();
  });

  it('should render custom pull text', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()} pullText="Drag down">
        <div>Child</div>
      </PullToRefresh>
    );
    expect(screen.getByText('Drag down')).toBeInTheDocument();
  });
});
