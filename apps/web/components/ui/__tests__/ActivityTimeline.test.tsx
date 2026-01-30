import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from '../ActivityTimeline';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { success: '#10B981', warning: '#F59E0B', info: '#3B82F6', secondary: '#6B7280', primary: '#0D9488', textSecondary: '#9CA3AF', textPrimary: '#111827', surface: '#FFFFFF', border: '#E5E7EB' },
    spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px' },
    typography: { fontSize: { sm: '14px', xs: '12px', '2xl': '24px' }, fontWeight: { medium: 500, bold: 700 } },
    borderRadius: { full: '9999px' },
  },
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, ...props }: { name: string }) => <span data-testid={`icon-${name}`} {...props} />,
}));

const activities = [
  { id: '1', type: 'job_completed' as const, title: 'Job Done', description: 'Plumbing fixed', timestamp: '2024-01-15T10:00:00Z' },
  { id: '2', type: 'review_received' as const, title: 'New Review', description: '5 stars', timestamp: '2024-01-14T09:00:00Z' },
];

describe('ActivityTimeline', () => {
  it('should render title', () => {
    render(<ActivityTimeline activities={activities} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<ActivityTimeline activities={activities} title="My Activity" />);
    expect(screen.getByText('My Activity')).toBeInTheDocument();
  });

  it('should render activity titles', () => {
    render(<ActivityTimeline activities={activities} />);
    expect(screen.getByText('Job Done')).toBeInTheDocument();
    expect(screen.getByText('New Review')).toBeInTheDocument();
  });

  it('should render activity descriptions', () => {
    render(<ActivityTimeline activities={activities} />);
    expect(screen.getByText('Plumbing fixed')).toBeInTheDocument();
  });

  it('should return null for empty activities', () => {
    const { container } = render(<ActivityTimeline activities={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
