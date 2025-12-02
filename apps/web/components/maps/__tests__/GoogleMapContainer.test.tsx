import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoogleMapContainer } from '../GoogleMapContainer';

// Mock Google Maps API (loaded via script tag)
beforeEach(() => {
  // Reset window.google before each test
  (window as any).google = undefined;
  
  // Mock document.createElement to intercept script creation
  const originalCreateElement = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'script') {
      const script = originalCreateElement('script') as HTMLScriptElement;
      
      // Simulate script loading
      setTimeout(() => {
        (window as any).google = {
          maps: {
            Map: jest.fn().mockImplementation((element: HTMLElement, options: google.maps.MapOptions) => ({
              setCenter: jest.fn(),
              setZoom: jest.fn(),
            })),
            ControlPosition: {},
          },
        };
        
        // Call onload if it exists
        if (script.onload) {
          script.onload(new Event('load') as any);
        }
      }, 0);
      
      return script;
    }
    return originalCreateElement(tagName);
  });
});

describe('GoogleMapContainer', () => {
  const mockOnMapLoad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock is set up above
  });

  it('should render loading state initially', () => {
    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    expect(screen.getByText(/loading map/i)).toBeInTheDocument();
  });

  it('should show error state when API key is missing', async () => {
    // Temporarily remove API key
    const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    render(
      <GoogleMapContainer
        center={{ lat: 51.5074, lng: -0.1278 }}
        zoom={10}
        onMapLoad={mockOnMapLoad}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load map/i)).toBeInTheDocument();
    });

    // Restore API key
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
  });

  it('should apply custom styles', () => {
    const customStyle = { borderRadius: '20px', backgroundColor: 'blue' };
    
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
});

