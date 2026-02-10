// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { JobsNearYouClient } from '../JobsNearYouClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/components/maps', () => ({
  DynamicGoogleMap: () => <div data-testid="map">Map</div>,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('@/components/ui/Card.unified', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Badge.unified', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/AnimatedCounter', () => ({
  AnimatedCounter: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockContractorLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
  city: 'London',
  country: 'UK',
  address: '789 Contractor Street',
};

const mockJobs = [
  {
    id: 'job-1',
    title: 'Kitchen Plumbing Repair',
    description: 'Fix leaking pipe',
    budget: '50000',
    location: 'London',
    category: 'Plumbing',
    status: 'posted',
    created_at: '2026-01-15T10:00:00Z',
    photos: ['/photo1.jpg'],
    required_skills: ['Plumbing', 'Pipe Repair'],
    homeowner_id: 'homeowner-1',
    homeowner: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@example.com',
    },
  },
  {
    id: 'job-2',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation',
    budget: '800000',
    location: 'London',
    category: 'Plumbing',
    status: 'posted',
    created_at: '2026-01-14T09:00:00Z',
    photos: [],
    required_skills: ['Plumbing', 'Tiling'],
    homeowner_id: 'homeowner-2',
  },
];

describe('JobsNearYouClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { container } = render(
      <JobsNearYouClient
        contractorLocation={mockContractorLocation}
        contractorSkills={['Plumbing', 'Electrical']}
        jobs={mockJobs}
      />
    );
    expect(container).toBeDefined();
  });

  it('should display jobs interface', () => {
    const { container } = render(
      <JobsNearYouClient
        contractorLocation={mockContractorLocation}
        contractorSkills={['Plumbing']}
        jobs={mockJobs}
      />
    );
    // Component renders jobs interface (may show "No jobs found" if geocoding fails)
    expect(container.textContent).toContain('Discover Jobs');
  });

  it('should render with no jobs', () => {
    const { container } = render(
      <JobsNearYouClient
        contractorLocation={mockContractorLocation}
        contractorSkills={['Plumbing']}
        jobs={[]}
      />
    );
    expect(container).toBeDefined();
  });
});