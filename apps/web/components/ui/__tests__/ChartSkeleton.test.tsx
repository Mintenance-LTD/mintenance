import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartSkeleton, DashboardSkeleton } from '../ChartSkeleton';

describe('ChartSkeleton', () => {
  it('should render without crashing', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should display loading text', () => {
    render(<ChartSkeleton />);
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should render title placeholder when title provided', () => {
    const { container } = render(<ChartSkeleton title="Revenue" />);
    expect(container.querySelector('.mb-4')).toBeInTheDocument();
  });

  it('should apply custom height', () => {
    const { container } = render(<ChartSkeleton height="500px" />);
    const chartArea = container.querySelector('.bg-gray-100');
    expect(chartArea).toHaveStyle({ height: '500px' });
  });
});

describe('DashboardSkeleton', () => {
  it('should render without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
