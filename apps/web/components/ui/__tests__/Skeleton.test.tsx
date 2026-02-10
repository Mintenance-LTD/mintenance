import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonGroup, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonBadge, SkeletonImage } from '../Skeleton';

vi.mock('@/lib/design-tokens', () => ({ default: {} }));

describe('Skeleton', () => {
  it('should render with status role', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have loading screen reader text', () => {
    render(<Skeleton />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should set aria-busy', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('should apply custom width and height', () => {
    render(<Skeleton width={100} height={50} />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '100px', height: '50px' });
  });
});

describe('SkeletonGroup', () => {
  it('should render children', () => {
    render(
      <SkeletonGroup>
        <Skeleton />
        <Skeleton />
      </SkeletonGroup>
    );
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });
});

describe('SkeletonText', () => {
  it('should render default 3 lines', () => {
    render(<SkeletonText />);
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });

  it('should render custom line count', () => {
    render(<SkeletonText lines={5} />);
    expect(screen.getAllByRole('status')).toHaveLength(5);
  });
});

describe('SkeletonAvatar', () => {
  it('should render', () => {
    render(<SkeletonAvatar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('SkeletonButton', () => {
  it('should render', () => {
    render(<SkeletonButton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('SkeletonBadge', () => {
  it('should render', () => {
    render(<SkeletonBadge />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('SkeletonImage', () => {
  it('should render', () => {
    render(<SkeletonImage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
