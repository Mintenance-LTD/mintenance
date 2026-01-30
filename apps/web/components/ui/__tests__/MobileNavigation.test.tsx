import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNavigation } from '../MobileNavigation';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('./Button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick} {...props}>{children}</button>,
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', white: '#FFF', textPrimary: '#111827', textSecondary: '#9CA3AF', border: '#E5E7EB', backgroundSecondary: '#F9FAFB' },
    spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px' },
    borderRadius: { base: '8px', lg: '12px' },
    typography: { fontSize: { sm: '14px', md: '16px', lg: '18px' }, fontWeight: { medium: 500, semibold: 600 } },
    shadows: { lg: '0 10px 15px rgba(0,0,0,0.1)' },
  },
}));

const items = [
  { label: 'Home', href: '/' },
  { label: 'Jobs', href: '/jobs' },
];

describe('MobileNavigation', () => {
  it('should render without crashing', () => {
    const { container } = render(<MobileNavigation items={items} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render menu button', () => {
    render(<MobileNavigation items={items} />);
    expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
  });

  it('should show navigation items when menu is opened', () => {
    render(<MobileNavigation items={items} />);
    fireEvent.click(screen.getByLabelText(/menu/i));
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
  });
});
