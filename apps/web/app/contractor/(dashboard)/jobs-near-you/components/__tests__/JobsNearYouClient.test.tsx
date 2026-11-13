// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { fireEvent, render, waitFor } from '@testing-library/react';
import { JobsNearYouClient } from '../JobsNearYouClient';
import { updateMarkers } from '../JobsMapController';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/components/maps', () => ({
  DynamicGoogleMap: ({ onMapLoad }: { onMapLoad: (map: google.maps.Map) => void }) =>
    <button onClick={() => onMapLoad({} as google.maps.Map)}>Load map</button>,
}));

vi.mock('../JobsMapController', () => ({
  updateMarkers: vi.fn(),
  handleMapLoad: (map: google.maps.Map, refs: { mapRef: { current: google.maps.Map | null } }) => {
    refs.mapRef.current = map;
  },
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('@/components/ui/Card.unified', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='card'>{children}</div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/Badge.unified', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid='badge'>{children}</span>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode; value: string; onValueChange: (value: string) => void;
  }) => (
    <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('clears the map job markers when filters exclude all jobs', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => ({
      ok: true,
      json: async () => String(url).includes('/geocode')
        ? { latitude: 51.51, longitude: -0.12 }
        : { jobIds: [] },
    } as Response));
    const screen = render(<JobsNearYouClient contractorLocation={mockContractorLocation}
      contractorSkills={['Plumbing']} jobs={mockJobs} />);
    fireEvent.click(await screen.findByText('Load map'));
    // First include one matching skill, then require more skills than any job has.
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '1' } });
    await waitFor(() => expect(updateMarkers).toHaveBeenLastCalledWith(
      expect.any(Object), expect.any(Object), mockContractorLocation,
      expect.arrayContaining([expect.objectContaining({ id: 'job-1' })]),
    ));
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '5' } });
    await waitFor(() => expect(updateMarkers).toHaveBeenLastCalledWith(
      expect.any(Object), expect.any(Object), mockContractorLocation, [],
    ));
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
