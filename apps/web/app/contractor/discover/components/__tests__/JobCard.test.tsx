import { render, screen } from '@testing-library/react';
import { JobCard } from '../JobCard';
import type { Job } from '@mintenance/types';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const mockJob: Partial<Job> = {
  id: 'test-job-1',
  title: 'Test Plumbing Job',
  description: 'Need to fix a leaking pipe in the kitchen',
  category: 'Plumbing',
  budget: 50000, // £500 in pence
  location: 'London, UK',
  created_at: new Date().toISOString(),
  status: 'open',
  photos: [],
};

describe('JobCard', () => {
  it('should render job with valid props', () => {
    const { container } = render(<JobCard job={mockJob as any} />);

    expect(screen.getByText('Test Plumbing Job')).toBeInTheDocument();
    expect(screen.getByText(/Need to fix a leaking pipe/)).toBeInTheDocument();
    expect(screen.getByText('Plumbing')).toBeInTheDocument();
  });

  it('should display location instead of budget', () => {
    // Budget display was removed 2026-05-22 — contractors price the job
    // themselves and the homeowner picks from the bids. The card now surfaces
    // a Location section in that slot.
    render(<JobCard job={mockJob as any} />);

    expect(screen.getByText('Location')).toBeInTheDocument();
    // formatLocationShort('London, UK') => 'London'
    expect(screen.getByText('London')).toBeInTheDocument();
    // No budget/currency value should be rendered.
    expect(screen.queryByText(/£50,000/)).not.toBeInTheDocument();
  });

  it('should handle missing title with fallback', () => {
    const minimalJob = {
      id: 'minimal-job',
      created_at: new Date().toISOString(),
      status: 'open',
    };

    const { container } = render(<JobCard job={minimalJob as any} />);

    expect(screen.getByText('Untitled Job')).toBeInTheDocument();
  });
});
