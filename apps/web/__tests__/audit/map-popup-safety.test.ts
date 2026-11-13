import { updateMarkers } from '@/app/contractor/(dashboard)/jobs-near-you/components/JobsMapController';
import {
  updateMapMarkers,
  type MapJob,
} from '@/app/contractor/(dashboard)/discover/components/DiscoverMapMarkers';

class Marker {
  static instances: Marker[] = [];
  setMap = vi.fn();
  listeners = new Map<string, () => void>();
  constructor(public options: { position: google.maps.LatLngLiteral }) {
    Marker.instances.push(this);
  }
  addListener(name: string, callback: () => void) {
    this.listeners.set(name, callback);
  }
  getPosition() {
    return this.options.position;
  }
}
class InfoWindow {
  static instances: InfoWindow[] = [];
  open = vi.fn();
  close = vi.fn();
  constructor(public options: { content: HTMLElement }) {
    InfoWindow.instances.push(this);
  }
}
const map = {
  fitBounds: vi.fn(),
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  getZoom: () => 12,
} as unknown as google.maps.Map;
const coords = { lat: 51.5, lng: -0.12 };
const attack = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
const job: MapJob = {
  id: 'job-1',
  title: 'Kitchen repair',
  description: 'Fix the tap',
  category: 'plumbing',
  budget: 120.75,
  priority: 'high',
  property: { address: 'London', postcode: 'SW1A 1AA' },
  lat: coords.lat,
  lng: coords.lng,
};

beforeEach(() => {
  Marker.instances = [];
  InfoWindow.instances = [];
  vi.clearAllMocks();
  vi.stubGlobal('google', {
    maps: {
      Marker,
      InfoWindow,
      LatLngBounds: class {
        extend() {
          return this;
        }
      },
      SymbolPath: { CIRCLE: 0, BACKWARD_CLOSED_ARROW: 1 },
      Animation: { BOUNCE: 1 },
      event: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

function nearbyRefs(): Parameters<typeof updateMarkers>[0] {
  return {
    mapRef: { current: map },
    markersRef: { current: [] },
    infoWindowsRef: { current: new Map() },
  };
}
function expectTextOnly(content: HTMLElement) {
  expect(content).toBeInstanceOf(HTMLElement);
  expect(
    content.querySelector('img, script, iframe, svg, [onclick], [onerror]')
  ).toBeNull();
  expect(content.textContent).toContain(attack);
}

it('renders nearby-job titles, locations, names and contractor location as text', () => {
  updateMarkers(nearbyRefs(), coords, { city: attack, country: attack }, [
    {
      id: 'job-1',
      title: attack,
      location: attack,
      coordinates: coords,
      budget: '120.75',
      homeowner: { first_name: attack, last_name: attack },
    },
  ]);
  expect(InfoWindow.instances).toHaveLength(2);
  InfoWindow.instances.forEach((window) =>
    expectTextOnly(window.options.content)
  );
  expect(
    InfoWindow.instances[1].options.content.querySelector('strong')?.textContent
  ).toBe(attack);
  expect(InfoWindow.instances[1].options.content.textContent).toContain(
    '120.75'
  );
});

it('renders a fallback homeowner email as text', () => {
  updateMarkers(nearbyRefs(), coords, {}, [
    {
      id: 'job-1',
      title: 'Repair',
      coordinates: coords,
      homeowner: { email: attack },
    },
  ]);
  expectTextOnly(InfoWindow.instances[1].options.content);
});

it.each([coords, null])(
  'removes old job markers and popups when jobs or location disappear (%j)',
  (nextCoords) => {
    const refs = nearbyRefs();
    updateMarkers(refs, coords, {}, [
      { id: 'job-1', title: 'Repair', coordinates: coords },
    ]);
    const oldMarkers = [...Marker.instances];
    const oldWindows = [...InfoWindow.instances];
    updateMarkers(refs, nextCoords, {}, []);
    oldMarkers.forEach((marker) =>
      expect(marker.setMap).toHaveBeenCalledWith(null)
    );
    oldWindows.forEach((window) => expect(window.close).toHaveBeenCalled());
    expect(refs.infoWindowsRef.current.has('job-1')).toBe(false);
    expect(refs.markersRef.current).toHaveLength(nextCoords ? 1 : 0);
  }
);

it('renders discovery fields as text and constructs a local details link without inline script', () => {
  const unsafeId = 'job\');alert(1);//"';
  updateMapMarkers(
    map,
    [],
    [
      {
        ...job,
        id: unsafeId,
        title: attack,
        description: attack,
        category: attack,
        priority: attack,
        property: { address: attack, postcode: attack },
      },
    ],
    { latitude: coords.lat, longitude: coords.lng, address: attack }
  );
  InfoWindow.instances.forEach((window) =>
    expectTextOnly(window.options.content)
  );
  const content = InfoWindow.instances[1].options.content;
  expect(content.querySelector('h3')?.textContent).toBe(attack);
  expect(content.querySelector('a')?.getAttribute('href')).toBe(
    `/contractor/bid/${encodeURIComponent(unsafeId)}/details`
  );
});

it('keeps carousel controls local to each popup, wraps in both directions and resets on marker click', () => {
  updateMapMarkers(
    map,
    [],
    [
      job,
      { ...job, id: 'job-2', title: 'Second job' },
      { ...job, id: 'job-3', lat: 55, title: 'Third job' },
      { ...job, id: 'job-4', lat: 55, title: 'Fourth job' },
    ],
    null
  );
  const [first, second] = InfoWindow.instances.map(
    (window) => window.options.content
  );
  const cards = first.querySelectorAll<HTMLElement>('.map-job-card');
  first.querySelector<HTMLButtonElement>('[aria-label="Next job"]')!.click();
  expect(cards[0].hidden).toBe(true);
  expect(cards[1].hidden).toBe(false);
  expect(first.textContent).toContain('2 of 2 jobs here');
  expect(second.textContent).toContain('1 of 2 jobs here');
  first.querySelector<HTMLButtonElement>('[aria-label="Next job"]')!.click();
  expect(cards[0].hidden).toBe(false);
  first
    .querySelector<HTMLButtonElement>('[aria-label="Previous job"]')!
    .click();
  expect(cards[1].hidden).toBe(false);
  Marker.instances[0].listeners.get('click')!();
  expect(cards[0].hidden).toBe(false);
  expect(first.textContent).toContain('1 of 2 jobs here');
  expect(InfoWindow.instances[0].open).toHaveBeenCalled();
  expect(first.querySelector('[onclick]')).toBeNull();
});
