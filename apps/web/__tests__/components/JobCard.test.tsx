import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobCard } from '@/components/cards/JobCard';

// lucide-react icons used by JobCard
vi.mock('lucide-react', () => ({
  MapPin: ({ className }: any) => <span data-testid="icon-mappin" className={className} />,
  Clock: ({ className }: any) => <span data-testid="icon-clock" className={className} />,
}));

const defaultProps = {
  id: '123',
  imageUrl: '/images/roof.jpg',
  imageAlt: 'Roof repair',
  title: 'Fix leaking roof',
  location: 'London, UK',
  distance: '2.5 miles',
  budgetMin: 3000,
  budgetMax: 5000,
  currency: '£',
  postedTime: '2 hours ago',
  status: 'open' as const,
  homeownerName: 'John Doe',
  homeownerAvatarUrl: '/avatars/john.jpg',
  onClick: vi.fn(),
};

describe('JobCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders job title correctly', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('Fix leaking roof')).toBeInTheDocument();
  });

  it('renders location text', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('London, UK')).toBeInTheDocument();
  });

  it('renders distance when provided', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('2.5 miles')).toBeInTheDocument();
  });

  it('does not render distance when not provided', () => {
    const { distance, ...propsWithoutDistance } = defaultProps;
    render(<JobCard {...propsWithoutDistance} />);
    expect(screen.queryByText('2.5 miles')).not.toBeInTheDocument();
  });

  it('renders budget range with currency', () => {
    render(<JobCard {...defaultProps} />);
    // The component renders: £3,000 - £5,000
    expect(screen.getByText(/£3,000/)).toBeInTheDocument();
    expect(screen.getByText(/£5,000/)).toBeInTheDocument();
  });

  it('renders posted time', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('Posted 2 hours ago')).toBeInTheDocument();
  });

  it('renders homeowner name', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders homeowner avatar with correct alt text', () => {
    render(<JobCard {...defaultProps} />);
    const avatar = screen.getByAltText("John Doe's avatar");
    expect(avatar).toBeInTheDocument();
  });

  it('renders job image with alt text', () => {
    render(<JobCard {...defaultProps} />);
    const image = screen.getByAltText('Roof repair');
    expect(image).toBeInTheDocument();
  });

  it('renders correct status badge for open status', () => {
    render(<JobCard {...defaultProps} status="open" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders correct status badge for in_progress status', () => {
    render(<JobCard {...defaultProps} status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders correct status badge for closed status', () => {
    render(<JobCard {...defaultProps} status="closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders correct status badge for pending status', () => {
    render(<JobCard {...defaultProps} status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('calls onClick with the job id when the card is clicked', () => {
    const { container } = render(<JobCard {...defaultProps} />);
    // The outer card div has role="button"
    const card = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.click(card);
    expect(defaultProps.onClick).toHaveBeenCalledWith('123');
  });

  it('calls onClick when View details button is clicked', () => {
    render(<JobCard {...defaultProps} />);
    const viewDetailsButton = screen.getByText('View details');
    fireEvent.click(viewDetailsButton);
    expect(defaultProps.onClick).toHaveBeenCalledWith('123');
  });

  it('supports keyboard activation via Enter key', () => {
    const { container } = render(<JobCard {...defaultProps} />);
    const card = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(defaultProps.onClick).toHaveBeenCalledWith('123');
  });

  it('supports keyboard activation via Space key', () => {
    const { container } = render(<JobCard {...defaultProps} />);
    const card = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.keyDown(card, { key: ' ' });
    expect(defaultProps.onClick).toHaveBeenCalledWith('123');
  });

  it('does not crash when onClick is not provided', () => {
    const { onClick, ...propsWithoutClick } = defaultProps;
    const { container } = render(<JobCard {...propsWithoutClick} />);
    const card = container.querySelector('[role="button"]') as HTMLElement;
    // Should not throw when clicked
    fireEvent.click(card);
  });

  it('applies custom className', () => {
    const { container } = render(<JobCard {...defaultProps} className="custom-class" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('renders the Homeowner label', () => {
    render(<JobCard {...defaultProps} />);
    expect(screen.getByText('Homeowner')).toBeInTheDocument();
  });
});