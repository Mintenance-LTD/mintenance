import React from 'react';
import { render } from '@testing-library/react';
import { SkeletonLoader, SkeletonCard, SkeletonList, SkeletonTable } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.querySelector('.skeleton-loader')).toBeInTheDocument();
  });

  it('should render with rectangular variant by default', () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.querySelector('.skeleton-loader--rectangular')).toBeInTheDocument();
  });

  it('should render circular variant', () => {
    const { container } = render(<SkeletonLoader variant="circular" />);
    expect(container.querySelector('.skeleton-loader--circular')).toBeInTheDocument();
  });

  it('should render multiple skeletons with count', () => {
    const { container } = render(<SkeletonLoader count={3} />);
    expect(container.querySelectorAll('.skeleton-loader').length).toBe(3);
  });

  it('should apply custom width and height', () => {
    const { container } = render(<SkeletonLoader width={200} height={50} />);
    const el = container.querySelector('.skeleton-loader');
    expect(el).toHaveStyle({ width: '200px', height: '50px' });
  });
});

describe('SkeletonCard', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
  });
});

describe('SkeletonList', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkeletonList />);
    expect(container.querySelector('.skeleton-list')).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelector('.skeleton-table')).toBeInTheDocument();
  });
});
