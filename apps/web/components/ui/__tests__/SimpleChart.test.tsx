import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { BarChart } from '../SimpleChart';

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', textPrimary: '#111827', textSecondary: '#9CA3AF' },
    spacing: { 2: '8px', 4: '16px' },
    typography: { fontSize: { xs: '12px', sm: '14px' }, fontWeight: { semibold: 600 } },
    borderRadius: { md: '8px' },
  },
}));

const data = [
  { label: 'Jan', value: 10 },
  { label: 'Feb', value: 20 },
  { label: 'Mar', value: 15 },
];

describe('BarChart', () => {
  it('should render bar labels', () => {
    render(<BarChart data={data} />);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('should render bar values when showValues is true', () => {
    render(<BarChart data={data} showValues />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('should render without values when showValues is false', () => {
    render(<BarChart data={data} showValues={false} />);
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
});
