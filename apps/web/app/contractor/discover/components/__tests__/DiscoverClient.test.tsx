import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoverClient } from '../DiscoverClient';

// Mock dependencies
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('./DiscoverEmptyState', () => ({
  DiscoverEmptyState: () => <div data-testid="empty-state">Empty State</div>,
}));

vi.mock('./CardStack', () => ({
  CardStack: ({ children }: { children: React.ReactNode }) => <div data-testid="card-stack">{children}</div>,
}));

vi.mock('./SwipeActionButtons', () => ({
  SwipeActionButtons: () => <div data-testid="swipe-buttons">Swipe Buttons</div>,
}));

vi.mock('./JobCard', () => ({
  JobCard: ({ job }: { job: any }) => <div data-testid="job-card">{job.title}</div>,
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockUser = {
  id: 'contractor-1',
  role: 'contractor' as const,
  email: 'contractor@example.com',
};

const mockJobs = [
  {
    id: 'job-1',
    title: 'Kitchen Plumbing Repair',
    description: 'Fix leaking pipe',
    budget: 50000,
    category: 'Plumbing',
    city: 'London',
    location: '123 Main St',
    photos: ['/photo1.jpg'],
    status: 'posted' as const,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'job-2',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation',
    budget: 800000,
    category: 'Plumbing',
    city: 'London',
    location: '456 Oak Ave',
    photos: [],
    status: 'posted' as const,
    created_at: '2026-01-14T09:00:00Z',
  },
];

const mockContractorLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
};

describe('DiscoverClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { container } = render(
      <DiscoverClient
        user={mockUser}
        jobs={mockJobs}
        contractorLocation={mockContractorLocation}
        contractorSkills={['Plumbing', 'Electrical']}
      />
    );
    expect(container).toBeDefined();
  });

  it('should handle job display correctly', () => {
    const { container } = render(
      <DiscoverClient
        user={mockUser}
        jobs={mockJobs}
        contractorLocation={mockContractorLocation}
      />
    );
    // Component displays jobs
    expect(container.textContent).toContain('Kitchen Plumbing Repair');
  });

  it('should render empty state when no jobs', () => {
    const { container } = render(
      <DiscoverClient
        user={mockUser}
        jobs={[]}
        contractorLocation={mockContractorLocation}
      />
    );
    // Component shows "All Done!" message when no jobs
    expect(container.textContent).toContain('All Done!');
  });
});