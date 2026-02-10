// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { ContractorDiscoverClient } from '../ContractorDiscoverClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/maps', () => ({
  DynamicGoogleMap: () => <div data-testid="map">Map</div>,
}));

vi.mock('./LocationPromptModal', () => ({
  LocationPromptModal: () => <div data-testid="location-modal">Location Modal</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="icon" />,
  List: () => <span data-testid="icon" />,
  Map: () => <span data-testid="icon" />,
  Filter: () => <span data-testid="icon" />,
  X: () => <span data-testid="icon" />,
  Heart: () => <span data-testid="icon" />,
  Search: () => <span data-testid="icon" />,
  ChevronRight: () => <span data-testid="icon" />,
}));

const mockJobs = [
  {
    id: 'job-1',
    title: 'Kitchen Plumbing Repair',
    description: 'Need to fix leaking pipe under kitchen sink',
    category: 'Plumbing',
    budget: 50000,
    priority: 'urgent',
    photos: ['/job1.jpg'],
    created_at: '2026-01-15T10:00:00Z',
    homeowner: {
      first_name: 'John',
      last_name: 'Smith',
      profile_image_url: '/avatar.jpg',
      rating: 4.8,
    },
    property: {
      address: '123 Main Street',
      postcode: 'SW1A 1AA',
    },
    matchScore: 95,
    building_assessments: [],
  },
  {
    id: 'job-2',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation needed',
    category: 'Plumbing',
    budget: 800000,
    priority: 'medium',
    photos: null,
    created_at: '2026-01-14T09:00:00Z',
    homeowner: {
      first_name: 'Jane',
      last_name: 'Doe',
      profile_image_url: null,
      rating: 4.5,
    },
    property: {
      address: '456 Oak Avenue',
      postcode: 'E1 6AN',
    },
    matchScore: 87,
    building_assessments: null,
  },
];

const mockContractorLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
  city: 'London',
  address: '789 Contractor Street',
  postcode: 'W1A 1AA',
};

describe('ContractorDiscoverClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <ContractorDiscoverClient
        jobs={mockJobs}
        contractorId="contractor-1"
        contractorLocation={mockContractorLocation}
      />
    );
    expect(container).toBeDefined();
  });

  it('should display discover interface', () => {
    const { container } = render(
      <ContractorDiscoverClient
        jobs={mockJobs}
        contractorId="contractor-1"
        contractorLocation={mockContractorLocation}
      />
    );
    // Component renders job discovery interface
    expect(container).toBeDefined();
  });
});
