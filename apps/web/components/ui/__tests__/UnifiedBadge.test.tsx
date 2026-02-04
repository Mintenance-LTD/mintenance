import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnifiedBadge, { StatusBadge, PriorityBadge, CategoryBadge, NotificationBadge, BadgeGroup } from '../UnifiedBadge';

describe('UnifiedBadge', () => {
  it('should render children', () => {
    render(<UnifiedBadge>Active</UnifiedBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render count instead of children', () => {
    render(<UnifiedBadge count={5}>Ignored</UnifiedBadge>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should cap count at max', () => {
    render(<UnifiedBadge count={150} max={99}>X</UnifiedBadge>);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should render remove button when removable', () => {
    const onRemove = vi.fn();
    render(<UnifiedBadge removable onRemove={onRemove}>Tag</UnifiedBadge>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBadge', () => {
  it('should render correct label for status', () => {
    render(<StatusBadge status="completed">Done</StatusBadge>);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('should use default label when no children', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it('should render priority label', () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });
});

describe('CategoryBadge', () => {
  it('should render category label', () => {
    render(<CategoryBadge category="plumbing" />);
    expect(screen.getByText('Plumbing')).toBeInTheDocument();
  });
});

describe('NotificationBadge', () => {
  it('should render count', () => {
    render(<NotificationBadge count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should return null when count is 0', () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should cap at max', () => {
    render(<NotificationBadge count={200} max={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});

describe('BadgeGroup', () => {
  it('should render children', () => {
    render(
      <BadgeGroup>
        <UnifiedBadge>A</UnifiedBadge>
        <UnifiedBadge>B</UnifiedBadge>
      </BadgeGroup>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
