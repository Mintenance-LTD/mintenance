import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation } from '../Navigation';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('./Button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', white: '#FFF', textPrimary: '#111827', textSecondary: '#9CA3AF', border: '#E5E7EB', backgroundSecondary: '#F9FAFB' },
    spacing: { 1: '4px', 2: '8px', 3: '12px' },
    borderRadius: { base: '8px', lg: '12px' },
    typography: { fontSize: { sm: '14px', md: '16px' }, fontWeight: { medium: 500 } },
  },
}));

const items = [
  { label: 'Home', href: '/' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Profile', href: '/profile', active: true },
];

describe('Navigation', () => {
  it('should render navigation items', () => {
    render(<Navigation items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should render links with correct hrefs', () => {
    render(<Navigation items={items} />);
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
  });

  it('should render badge when provided', () => {
    render(<Navigation items={[{ label: 'Messages', href: '/messages', badge: 5 }]} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
