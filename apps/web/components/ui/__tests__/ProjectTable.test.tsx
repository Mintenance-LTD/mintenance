import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTable } from '../ProjectTable';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { success: '#10B981', textSecondary: '#9CA3AF', backgroundSecondary: '#F9FAFB', border: '#E5E7EB' },
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/ui/figma', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

const projects = [
  { id: '1', name: 'Kitchen Repair', manager: 'John', dueDate: '2024-02-01', status: 'completed' as const, progress: 100 },
  { id: '2', name: 'Bathroom Fix', manager: 'Jane', dueDate: '2024-03-01', status: 'on_going' as const, progress: 60 },
];

describe('ProjectTable', () => {
  it('should render project names', () => {
    render(<ProjectTable projects={projects} />);
    expect(screen.getByText('Kitchen Repair')).toBeInTheDocument();
    expect(screen.getByText('Bathroom Fix')).toBeInTheDocument();
  });

  it('should render project managers', () => {
    render(<ProjectTable projects={projects} />);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('should render Project Summary heading', () => {
    render(<ProjectTable projects={projects} />);
    expect(screen.getByText('Project Summary')).toBeInTheDocument();
  });

  it('should show empty state when no projects', () => {
    render(<ProjectTable projects={[]} />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  it('should show project count', () => {
    render(<ProjectTable projects={projects} />);
    expect(screen.getByText('2 total projects')).toBeInTheDocument();
  });
});
