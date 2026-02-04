import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../DataTable';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { surface: '#FFF', border: '#E5E7EB', textPrimary: '#111827', textSecondary: '#9CA3AF', primary: '#0D9488', backgroundSecondary: '#F9FAFB' },
    spacing: { 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px' },
    typography: { fontSize: { sm: '14px', md: '16px', '2xl': '24px' }, fontWeight: { medium: 500, bold: 700 } },
    borderRadius: { lg: '12px' },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)' },
  },
}));

vi.mock('../EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('../Card', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

const data = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
];

describe('DataTable', () => {
  it('should render column headers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should render data rows', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('should render title when provided', () => {
    render(<DataTable columns={columns} data={data} title="Users" />);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });
});
