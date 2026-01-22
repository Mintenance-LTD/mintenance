
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render } from '../../test-utils';
import { ServiceAreasStats } from '../ServiceAreasStats';

// Mock service areas data
const mockServiceAreas = [
  {
    id: '1',
    contractor_id: 'contractor-1',
    postcode_prefix: 'SW1',
    city: 'London',
    is_active: true,
    is_primary_area: true,
    radius_km: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    contractor_id: 'contractor-1',
    postcode_prefix: 'E1',
    city: 'London',
    is_active: true,
    is_primary_area: false,
    radius_km: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    contractor_id: 'contractor-1',
    postcode_prefix: 'N1',
    city: 'London',
    is_active: false,
    is_primary_area: false,
    radius_km: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('ServiceAreasStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { toJSON } = render(<ServiceAreasStats serviceAreas={mockServiceAreas} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should display correct stats', () => {
    const { getByText } = render(<ServiceAreasStats serviceAreas={mockServiceAreas} />);
    expect(getByText('3')).toBeTruthy(); // Total areas
    expect(getByText('2')).toBeTruthy(); // Active areas
    expect(getByText('1')).toBeTruthy(); // Either inactive or primary
  });

  it('should display content correctly with empty array', () => {
    const { toJSON } = render(<ServiceAreasStats serviceAreas={[]} />);
    expect(toJSON()).toBeTruthy();
  });
});
