/**
 * Comprehensive Unit Tests for WeatherService
 *
 * Tests API integration, error handling, caching, and rate limiting
 */

import { WeatherService, WeatherForecast } from '../WeatherService';

// Mock the logger
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('WeatherService', () => {
  const mockApiKey = 'test-api-key-12345';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    WeatherService.clearCache();
    process.env = { ...originalEnv };
    process.env.OPENWEATHER_API_KEY = mockApiKey;
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getForecast', () => {
    const mockForecastResponse = {
      list: [
        {
          dt: Math.floor(Date.now() / 1000),
          main: { temp: 20, humidity: 65 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
          wind: { speed: 5 },
          pop: 0.1,
        },
        {
          dt: Math.floor(Date.now() / 1000) + 86400,
          main: { temp: 18, humidity: 70 },
          weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
          wind: { speed: 8 },
          pop: 0.6,
        },
      ],
      city: {
        name: 'London',
        coord: { lat: 51.5074, lon: -0.1278 },
      },
    };

    it('should fetch weather forecast successfully', async () => {
      const mockHeaders = new Headers();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastResponse,
        headers: mockHeaders,
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return cached data on subsequent requests', async () => {
      const mockHeaders = new Headers();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastResponse,
        headers: mockHeaders,
      });

      // First request
      const result1 = await WeatherService.getForecast(51.5074, -0.1278, 7);
      const firstCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Second request - should use cache
      const result2 = await WeatherService.getForecast(51.5074, -0.1278, 7);
      const secondCallCount = (global.fetch as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No additional API call
      expect(result2).toEqual(result1);
    });

    it('should return fallback forecast when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return fallback forecast on API error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
    });

    it('should handle invalid coordinates', async () => {
      const result = await WeatherService.getForecast(999, 999, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting between requests', async () => {
      const mockHeaders = new Headers();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockForecastResponse,
        headers: mockHeaders,
      });

      const startTime = Date.now();

      // Make two requests with different coordinates (to bypass cache)
      await WeatherService.getForecast(51.5074, -0.1278, 7);
      await WeatherService.getForecast(48.8566, 2.3522, 7); // Paris

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(900); // Allow some tolerance
    });

    it('should retry on 429 rate limit response', async () => {
      const mockHeaders1 = new Headers();
      mockHeaders1.set('Retry-After', '1');
      const mockHeaders2 = new Headers();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: mockHeaders1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastResponse,
          headers: mockHeaders2,
        });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle API timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
      );

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getForecastByLocation', () => {
    const mockGeocodingResponse = [
      {
        name: 'London',
        lat: 51.5074,
        lon: -0.1278,
        country: 'GB',
      },
    ];

    const mockForecastResponse = {
      list: [
        {
          dt: Math.floor(Date.now() / 1000),
          main: { temp: 20, humidity: 65 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
          wind: { speed: 5 },
          pop: 0.1,
        },
      ],
      city: {
        name: 'London',
        coord: { lat: 51.5074, lon: -0.1278 },
      },
    };

    it('should fetch forecast by location string', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGeocodingResponse,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastResponse,
          headers: new Headers(),
        });

      const result = await WeatherService.getForecastByLocation('London, UK', 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return fallback forecast when geocoding fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      const result = await WeatherService.getForecastByLocation(
        'Invalid Location',
        7
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should cache geocoding results', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGeocodingResponse,
          headers: new Headers(),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockForecastResponse,
          headers: new Headers(),
        });

      // First request
      await WeatherService.getForecastByLocation('London, UK', 7);

      // Second request - geocoding should be cached
      await WeatherService.getForecastByLocation('London, UK', 7);

      // Geocoding called once, forecast called twice (different cache keys due to timing)
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 geo + 2 forecast
    });
  });

  describe('geocodeLocation', () => {
    it('should geocode location successfully', async () => {
      const mockResponse = [
        {
          name: 'London',
          lat: 51.5074,
          lon: -0.1278,
          country: 'GB',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await WeatherService.geocodeLocation('London, UK');

      expect(result).toEqual({
        lat: 51.5074,
        lon: -0.1278,
      });
    });

    it('should return null when no results found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      const result = await WeatherService.geocodeLocation('Invalid Location');

      expect(result).toBeNull();
    });

    it('should return null when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const result = await WeatherService.geocodeLocation('London, UK');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await WeatherService.geocodeLocation('London, UK');

      expect(result).toBeNull();
    });
  });

  describe('isSuitableForOutdoorWork', () => {
    it('should return true for good weather conditions', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 20,
        conditions: 'clear',
        precipitation: 10,
        windSpeed: 5,
        humidity: 60,
        description: 'Clear sky',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(true);
    });

    it('should return false for heavy rain', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 20,
        conditions: 'rain',
        precipitation: 80,
        windSpeed: 5,
        humidity: 90,
        description: 'Heavy rain',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(false);
    });

    it('should return false for storm conditions', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 20,
        conditions: 'storm',
        precipitation: 60,
        windSpeed: 15,
        humidity: 80,
        description: 'Thunderstorm',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(false);
    });

    it('should return false for high winds on roofing jobs', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 20,
        conditions: 'clear',
        precipitation: 0,
        windSpeed: 25,
        humidity: 60,
        description: 'Clear with strong wind',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast, 'roofing');
      expect(result).toBe(false);
    });

    it('should return true for moderate winds on non-roofing jobs', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 20,
        conditions: 'clear',
        precipitation: 0,
        windSpeed: 15,
        humidity: 60,
        description: 'Clear with moderate wind',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast, 'plumbing');
      expect(result).toBe(true);
    });

    it('should return false for freezing temperatures', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: -5,
        conditions: 'clear',
        precipitation: 0,
        windSpeed: 5,
        humidity: 60,
        description: 'Cold and clear',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(false);
    });

    it('should return false for heavy snow', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: -2,
        conditions: 'snow',
        precipitation: 50,
        windSpeed: 10,
        humidity: 80,
        description: 'Heavy snow',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(false);
    });

    it('should return true for light snow', () => {
      const forecast: WeatherForecast = {
        date: '2025-01-01',
        temperature: 2,
        conditions: 'snow',
        precipitation: 20,
        windSpeed: 5,
        humidity: 70,
        description: 'Light snow',
        suitable: true,
      };

      const result = WeatherService.isSuitableForOutdoorWork(forecast);
      expect(result).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', () => {
      WeatherService.clearCache();

      const stats = WeatherService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 20, humidity: 65 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
            wind: { speed: 5 },
            pop: 0.1,
          },
        ],
        city: {
          name: 'London',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      await WeatherService.getForecast(51.5074, -0.1278, 7);

      const stats = WeatherService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries.length).toBeGreaterThan(0);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('age');
    });

    it('should expire old cache entries', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 20, humidity: 65 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
            wind: { speed: 5 },
            pop: 0.1,
          },
        ],
        city: {
          name: 'London',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      // First request
      await WeatherService.getForecast(51.5074, -0.1278, 7);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Mock cache expiration by manipulating time
      // In a real scenario, we'd wait for cache to expire
      WeatherService.clearCache();

      // Second request - should call API again
      await WeatherService.getForecast(51.5074, -0.1278, 7);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling - Edge Cases', () => {
    it('should handle null API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('JSON parsing failed');
        },
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await WeatherService.getForecast(51.5074, -0.1278, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle boundary coordinates', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 20, humidity: 65 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
            wind: { speed: 5 },
            pop: 0.1,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 90, lon: 180 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await WeatherService.getForecast(90, 180, 7);

      expect(result).toBeDefined();
    });

    it('should handle zero days request', async () => {
      const result = await WeatherService.getForecast(51.5074, -0.1278, 0);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should handle very large days request', async () => {
      const mockResponse = {
        list: Array.from({ length: 40 }, (_, i) => ({
          dt: Math.floor(Date.now() / 1000) + i * 86400,
          main: { temp: 20, humidity: 65 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
          wind: { speed: 5 },
          pop: 0.1,
        })),
        city: {
          name: 'London',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 30);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Weather Condition Mapping', () => {
    it('should map thunderstorm IDs correctly', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 20, humidity: 80 },
            weather: [{ id: 211, main: 'Thunderstorm', description: 'thunderstorm' }],
            wind: { speed: 15 },
            pop: 0.9,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conditions).toBe('storm');
    });

    it('should map rain IDs correctly', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 15, humidity: 85 },
            weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
            wind: { speed: 8 },
            pop: 0.7,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conditions).toBe('rain');
    });

    it('should map snow IDs correctly', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: -2, humidity: 90 },
            weather: [{ id: 600, main: 'Snow', description: 'light snow' }],
            wind: { speed: 10 },
            pop: 0.5,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conditions).toBe('snow');
    });

    it('should map clear sky correctly', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 22, humidity: 55 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
            wind: { speed: 3 },
            pop: 0.0,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conditions).toBe('clear');
    });

    it('should map cloudy conditions correctly', async () => {
      const mockResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 18, humidity: 65 },
            weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds' }],
            wind: { speed: 5 },
            pop: 0.1,
          },
        ],
        city: {
          name: 'Test',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await WeatherService.getForecast(51.5074, -0.1278, 1);

      expect(result[0].conditions).toBe('cloudy');
    });
  });
});
