import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayTasks } from '../TodayTasks';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', success: '#10B981', textPrimary: '#111827', textSecondary: '#9CA3AF', border: '#E5E7EB' },
    spacing: { 2: '8px', 3: '12px', 4: '16px' },
    borderRadius: { lg: '12px', full: '9999px' },
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/ui/figma', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

const tasks = [
  { id: '1', title: 'Fix boiler', status: 'pending' as const, completed: false },
  { id: '2', title: 'Install tap', status: 'approved' as const, completed: true },
];

describe('TodayTasks', () => {
  it('should render heading', () => {
    render(<TodayTasks tasks={tasks} />);
    expect(screen.getByText('Today Tasks')).toBeInTheDocument();
  });

  it('should render task titles', () => {
    render(<TodayTasks tasks={tasks} />);
    expect(screen.getByText('Fix boiler')).toBeInTheDocument();
    expect(screen.getByText('Install tap')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<TodayTasks tasks={tasks} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
  });

  it('should show task count in tab', () => {
    render(<TodayTasks tasks={tasks} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should accept onToggleTask callback', () => {
    const onToggle = vi.fn();
    const { container } = render(<TodayTasks tasks={tasks} onToggleTask={onToggle} />);
    // Component renders successfully with callback prop
    expect(container.firstChild).toBeInTheDocument();
  });
});
