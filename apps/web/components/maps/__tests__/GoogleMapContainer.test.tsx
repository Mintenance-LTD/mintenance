import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GoogleMapContainer } from '../GoogleMapContainer';

// Mock the ErrorBoundary to just render children
vi.mock('../../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

// Mock the theme to provide all needed values
vi.mock('@/lib/theme', () => ({
  theme: {
    spacing: { 2: '8px', 4: '16px', 8: '32px' },
    colors: {
      primary: '#0F172A',
      primaryDark: '#1e3a8a',
      error: '#EF4444',
      backgroundSecondary: '#F8FAFC',
      border: '#E2E8F0',
      textSecondary: '#64748B',
    },
    typography: {
      fontSize: { sm: '13px', base: '15px' },
      fontWeight: { medium: '500' },
    },
    borderRadius: { md: '8px', lg: '12px' },
  },
}));

describe('GoogleMapContainer', () => {
  const mockOnMapLoad = vi.fn();
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  afterEach(() => {
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
      expect(screen.getByText('Map configuration error. Please contact support.')).toBeInTheDocument();
    });
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
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key-for-google-maps';

    // Ensure google.maps is not available
    (window as any).google = undefined;

    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    // In the test environment, the script element fails to load
    // and the component transitions to error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load map. Please try again.')).toBeInTheDocument();
    });
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
        className="custom-map-class"
      />
    );

    const mapContainer = container.firstChild as HTMLElement;
    expect(mapContainer).toHaveClass('custom-map-class');
  });
});
