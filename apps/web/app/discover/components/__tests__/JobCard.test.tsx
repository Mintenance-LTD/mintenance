import { render, screen } from '@testing-library/react';
import { JobCard } from '../JobCard';
import type { Job } from '@mintenance/types';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const mockJob: Partial<Job> = {
  id: 'test-job-1',
  title: 'Test Electrical Job',
  description: 'Need electrical wiring for new room extension',
  category: 'Electrical',
  budget: 100000, // £1000 in pence
  location: 'Manchester, UK',
  created_at: new Date().toISOString(),
  status: 'open',
  photos: [],
};

describe('JobCard', () => {
  it('should render job with valid props', () => {
    const { container } = render(<JobCard job={mockJob as any} />);

    expect(screen.getByText('Test Electrical Job')).toBeInTheDocument();
    expect(screen.getByText(/Need electrical wiring/)).toBeInTheDocument();
    expect(screen.getByText('Electrical')).toBeInTheDocument();
  });

  it('should display budget information', () => {
    const { container } = render(<JobCard job={mockJob as any} />);

    // Budget is stored in pence, formatMoney shows actual value
    expect(screen.getByText(/£100,000/)).toBeInTheDocument();
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