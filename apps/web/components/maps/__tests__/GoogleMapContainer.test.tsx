import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { GoogleMapContainer } from '../GoogleMapContainer';

// Mock the ErrorBoundary to just render children
vi.mock('../../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock the logger to avoid import issues with @mintenance/shared
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Exercise the real design tokens: mocking colors would hide contrast regressions.
function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.startsWith('#')
      ? color.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16))
      : color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const linear = channels.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const light = luminance(foreground);
  const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

function expectReadableMapError(message: string) {
  const text = screen.getByText(message);
  const panel = text.closest('[data-map-state="error"]');
  expect(panel).not.toBeNull();
  expect(
    contrastRatio(
      getComputedStyle(text).color,
      getComputedStyle(panel!).backgroundColor
    )
  ).toBeGreaterThanOrEqual(4.5);
}

describe('GoogleMapContainer', () => {
  const mockOnMapLoad = vi.fn();
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    document.getElementById('google-maps-script')?.remove();
    (window as any).google = undefined;
    originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const append = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      // Drive provider load/error events explicitly; never download Google in unit tests.
      if (node instanceof HTMLScriptElement) node.type = 'application/json';
      return append(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore env var
    if (originalApiKey !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalApiKey;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  });

  it('should show error state when API key is missing', async () => {
    // Ensure no API key is set
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Map configuration error. Please contact support.')
      ).toBeInTheDocument();
    });
    expectReadableMapError('Map configuration error. Please contact support.');
  });

  it('should show a Try Again button in error state', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should show error state when API key is present but script fails to load', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY =
      'test-api-key-for-google-maps';

    // Ensure google.maps is not available
    (window as any).google = undefined;

    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    fireEvent.error(document.getElementById('google-maps-script')!);
    await waitFor(() => {
      expect(
        screen.getByText('Failed to load map. Please try again.')
      ).toBeInTheDocument();
    });
    expectReadableMapError('Failed to load map. Please try again.');
  });

  it('should apply custom styles to the container', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const customStyle = { borderRadius: '20px' };

    const { container } = render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
        style={customStyle}
      />
    );

    const mapContainer = container.firstChild as HTMLElement;
    expect(mapContainer).toHaveStyle('border-radius: 20px');
  });

  it('should apply custom className to the container', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { container } = render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
        className='custom-map-class'
      />
    );

    const mapContainer = container.firstChild as HTMLElement;
    expect(mapContainer).toHaveClass('custom-map-class');
  });
  it('retries a failed script and initializes the replacement map', () => {
    vi.useFakeTimers();
    try {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'synthetic-key';
      render(
        <GoogleMapContainer
          center={{ lat: 51, lng: 0 }}
          onMapLoad={mockOnMapLoad}
        />
      );
      const failed = document.getElementById('google-maps-script')!;
      fireEvent.error(failed);
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      const replacement = document.getElementById('google-maps-script');
      expect(replacement).not.toBeNull();
      expect(replacement).not.toBe(failed);
      const Map = vi.fn(function () {});
      (window as any).google = { maps: { Map } };
      act(() => vi.advanceTimersByTime(100));
      expect(Map).toHaveBeenCalledTimes(1);
      expect(mockOnMapLoad).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out an existing script instead of waiting indefinitely', () => {
    vi.useFakeTimers();
    try {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'synthetic-key';
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      document.head.appendChild(script);
      render(<GoogleMapContainer center={{ lat: 51, lng: 0 }} />);
      act(() => vi.advanceTimersByTime(15000));
      expect(
        screen.getByRole('button', { name: 'Try Again' })
      ).toBeInTheDocument();
      expect(document.getElementById('google-maps-script')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
