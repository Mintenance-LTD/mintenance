import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { milesToKm } from '@mintenance/shared';
import { ContractorDiscoverClient } from '@/app/contractor/(dashboard)/discover/components/ContractorDiscoverClient';
import type { DiscoverJob } from '@/app/contractor/(dashboard)/discover/components/DiscoverJobCard';

const { push, markers } = vi.hoisted(() => ({
  push: vi.fn(),
  markers: new Map<string, () => void>(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: React.PropsWithChildren) => children,
}));
vi.mock(
  '@/app/contractor/(dashboard)/discover/components/useDiscoverJobActions',
  () => ({
    useDiscoverJobActions: () => ({
      savedJobIds: new Set(),
      skippedJobIds: skipped,
    }),
  })
);
vi.mock(
  '@/app/contractor/(dashboard)/discover/components/LocationPromptModal',
  () => ({
    LocationPromptModal: () => null,
  })
);
vi.mock('@/components/maps', () => ({
  DynamicGoogleMap: ({ onMapLoad }: { onMapLoad: (map: unknown) => void }) => (
    <button onClick={() => onMapLoad({ fitBounds: vi.fn(), panTo: vi.fn() })}>
      Load test map
    </button>
  ),
}));

const skipped = new Set<string>();
const center = {
  latitude: 51.5,
  longitude: -0.12,
  city: 'London',
  postcode: 'SW1A 1AA',
};
function fixture(
  id: string,
  title: string,
  miles: number,
  lat: number
): DiscoverJob {
  return {
    id,
    title,
    description: 'Synthetic test listing',
    category: 'Gardening',
    budget: 100,
    created_at: '2026-11-24',
    priority: null,
    photos: null,
    latitude: lat,
    longitude: -0.12,
    serverDistanceKm: milesToKm(miles),
    matchScore: 0,
    homeowner: null,
    property: null,
  } as DiscoverJob;
}

afterEach(() => {
  cleanup();
  push.mockClear();
  markers.clear();
  vi.unstubAllGlobals();
});

it('includes the 9-mile job, excludes the 35-mile job and opens the exact pin', () => {
  vi.stubGlobal('google', {
    maps: {
      Marker: class {
        constructor(private options: { title: string }) {}
        addListener(_event: string, fn: () => void) {
          markers.set(this.options.title, fn);
        }
        setMap() {}
      },
      InfoWindow: class {},
      LatLngBounds: class {
        extend() {}
      },
      SymbolPath: {},
      Animation: {},
      event: { addListener: vi.fn() },
    },
  });
  render(
    <ContractorDiscoverClient
      contractorId='contractor'
      contractorLocation={center}
      radiusSearchAvailable
      jobs={[
        fixture('near-id', 'Near garden job', 9, 51.63),
        fixture('far-id', 'Far garden job', 35, 52.0),
      ]}
    />
  );
  expect(
    screen.getByText(/Search centre.*London.*SW1A 1AA/)
  ).toBeInTheDocument();
  expect(screen.getByText('Near garden job')).toBeInTheDocument();
  expect(screen.queryByText('Far garden job')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Load test map' }));
  fireEvent.click(screen.getByRole('button', { name: '30 mi' }));
  expect(markers.has('Far garden job')).toBe(false);
  expect(markers.has('Near garden job')).toBe(true);
  const pinButton = screen.getByRole('button', {
    name: 'Show Near garden job on map',
  });
  fireEvent.click(pinButton);
  expect(pinButton).toHaveAttribute('aria-pressed', 'true');
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Near garden job').closest('[data-job-id]')!);
  expect(push).toHaveBeenCalledWith('/contractor/bid/near-id/details');
  push.mockClear();
  markers.get('Near garden job')?.();
  expect(push).toHaveBeenCalledWith('/contractor/bid/near-id/details');
});

it('only offers expansion up to the final chip in both map and card views', () => {
  render(
    <ContractorDiscoverClient
      contractorId='contractor'
      contractorLocation={center}
      radiusSearchAvailable
      jobs={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand Search Radius' }));
  expect(screen.getByRole('button', { name: '20 mi' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand Search Radius' }));
  expect(screen.getByRole('button', { name: '30 mi' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(
    screen.queryByRole('button', { name: 'Expand Search Radius' })
  ).toBeNull();
});

it('leaves the radius unclaimed when the geographic query is unavailable', () => {
  render(
    <ContractorDiscoverClient
      contractorId='contractor'
      contractorLocation={center}
      radiusSearchAvailable={false}
      jobs={[]}
    />
  );
  expect(
    screen.getByText(/Distance results are temporarily unavailable/)
  ).toBeInTheDocument();
  expect(screen.queryByText(/within \d+ mi/)).toBeNull();
});
