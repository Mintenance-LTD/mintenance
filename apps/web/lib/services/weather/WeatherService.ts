import { logger } from '@mintenance/shared';

/**
 * Weather forecast data structure
 */
export interface WeatherForecast {
  date: string;
  temperature: number;
  conditions: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';
  precipitation: number;
  windSpeed: number;
  humidity: number;
  description: string;
  suitable: boolean;
}

/**
 * Coordinates for location-based weather lookup
 */
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * OpenWeatherMap API response types
 */
interface OpenWeatherMapForecastItem {
  dt: number;
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
  };
  pop: number; // Probability of precipitation (0-1)
}

interface OpenWeatherMapForecastResponse {
  list: OpenWeatherMapForecastItem[];
  city: {
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
  };
}

interface OpenWeatherMapGeocodingResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

/**
 * Cache entry for weather data
 */
interface CacheEntry {
  data: WeatherForecast[];
  timestamp: number;
}

/**
 * Weather Service for fetching real-time weather forecasts
 * Uses OpenWeatherMap API for weather data
 */
export class WeatherService {
  private static readonly API_KEY = process.env.OPENWEATHER_API_KEY;
  private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private static readonly GEO_URL = 'https://api.openweathermap.org/geo/1.0';
  private static readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000; // 1 second

  // In-memory cache for weather data
  private static cache: Map<string, CacheEntry> = new Map();

  // Rate limiting
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL_MS = 1000; // 1 second between requests

  /**
   * Get weather forecast for coordinates
   */
  static async getForecast(
    lat: number,
    lon: number,
    days: number = 7
  ): Promise<WeatherForecast[]> {
    try {
      // Validate API key
      if (!this.API_KEY) {
        logger.warn('OpenWeatherMap API key not configured', {
          service: 'WeatherService',
        });
        return this.getFallbackForecast(days);
      }

      // Validate coordinates
      if (!this.isValidCoordinates(lat, lon)) {
        logger.error('Invalid coordinates provided', {
          service: 'WeatherService',
          lat,
          lon,
        });
        return this.getFallbackForecast(days);
      }

      // Check cache
      const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${days}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Using cached weather data', {
          service: 'WeatherService',
          cacheKey,
        });
        return cached;
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Fetch from API with retry logic
      const forecast = await this.fetchWithRetry(lat, lon, days);

      // Cache the result
      this.cache.set(cacheKey, {
        data: forecast,
        timestamp: Date.now(),
      });

      logger.info('Weather forecast fetched successfully', {
        service: 'WeatherService',
        lat,
        lon,
        days,
        forecastCount: forecast.length,
      });

      return forecast;
    } catch (error) {
      logger.error('Error fetching weather forecast', error, {
        service: 'WeatherService',
        lat,
        lon,
        days,
      });
      return this.getFallbackForecast(days);
    }
  }

  /**
   * Get weather forecast for a location string (e.g., "London, UK")
   */
  static async getForecastByLocation(
    location: string,
    days: number = 7
  ): Promise<WeatherForecast[]> {
    try {
      // Geocode the location to coordinates
      const coordinates = await this.geocodeLocation(location);
      if (!coordinates) {
        logger.warn('Failed to geocode location', {
          service: 'WeatherService',
          location,
        });
        return this.getFallbackForecast(days);
      }

      return this.getForecast(coordinates.lat, coordinates.lon, days);
    } catch (error) {
      logger.error('Error fetching weather forecast by location', error, {
        service: 'WeatherService',
        location,
      });
      return this.getFallbackForecast(days);
    }
  }

  /**
   * Geocode a location string to coordinates
   */
  static async geocodeLocation(location: string): Promise<Coordinates | null> {
    try {
      if (!this.API_KEY) {
        return null;
      }

      // Check cache
      const cacheKey = `geo:${location.toLowerCase()}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached as unknown as Coordinates;
      }

      await this.enforceRateLimit();

      const url = `${this.GEO_URL}/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.API_KEY}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('Geocoding API request failed', {
          service: 'WeatherService',
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const data: OpenWeatherMapGeocodingResponse[] = await response.json();

      if (!data || data.length === 0) {
        logger.warn('No geocoding results found', {
          service: 'WeatherService',
          location,
        });
        return null;
      }

      const coordinates: Coordinates = {
        lat: data[0].lat,
        lon: data[0].lon,
      };

      // Cache the result (longer duration for geocoding)
      this.cache.set(cacheKey, {
        data: coordinates as unknown as WeatherForecast[],
        timestamp: Date.now(),
      });

      logger.info('Location geocoded successfully', {
        service: 'WeatherService',
        location,
        coordinates,
      });

      return coordinates;
    } catch (error) {
      logger.error('Error geocoding location', error, {
        service: 'WeatherService',
        location,
      });
      return null;
    }
  }

  /**
   * Check if weather conditions are suitable for outdoor work
   */
  static isSuitableForOutdoorWork(
    forecast: WeatherForecast,
    category?: string
  ): boolean {
    // Heavy rain is unsuitable for most outdoor work
    if (forecast.precipitation > 50) {
      return false;
    }

    // Storm conditions are always unsuitable
    if (forecast.conditions === 'storm') {
      return false;
    }

    // High winds are unsuitable for roofing and exterior work
    if (forecast.windSpeed > 20 && category) {
      const windSensitiveCategories = ['roofing', 'exterior', 'scaffolding'];
      if (
        windSensitiveCategories.some((cat) =>
          category.toLowerCase().includes(cat)
        )
      ) {
        return false;
      }
    }

    // Very cold temperatures are unsuitable for outdoor work
    if (forecast.temperature < 0) {
      return false;
    }

    // Heavy snow is unsuitable
    if (forecast.conditions === 'snow' && forecast.precipitation > 30) {
      return false;
    }

    return true;
  }

  /**
   * Fetch weather forecast with retry logic
   */
  private static async fetchWithRetry(
    lat: number,
    lon: number,
    days: number,
    retryCount: number = 0
  ): Promise<WeatherForecast[]> {
    try {
      const url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${this.API_KEY}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429 && retryCount < this.MAX_RETRIES) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.RETRY_DELAY_MS * Math.pow(2, retryCount);

          logger.warn('Rate limit hit, retrying', {
            service: 'WeatherService',
            retryCount,
            delayMs: delay,
          });

          await this.sleep(delay);
          return this.fetchWithRetry(lat, lon, days, retryCount + 1);
        }

        throw new Error(
          `Weather API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data: OpenWeatherMapForecastResponse = await response.json();
      return this.transformForecastData(data, days);
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, retryCount);
        logger.warn('Weather API request failed, retrying', {
          service: 'WeatherService',
          retryCount,
          delayMs: delay,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.sleep(delay);
        return this.fetchWithRetry(lat, lon, days, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Transform OpenWeatherMap API response to our forecast format
   */
  private static transformForecastData(
    data: OpenWeatherMapForecastResponse,
    days: number
  ): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const dailyForecasts: Map<string, OpenWeatherMapForecastItem[]> = new Map();

    // Group forecasts by day
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, []);
      }
      dailyForecasts.get(dateKey)!.push(item);
    });

    // Process each day
    let processedDays = 0;
    for (const [dateKey, items] of dailyForecasts) {
      if (processedDays >= days) break;

      // Calculate daily averages/aggregates
      const avgTemp =
        items.reduce((sum, item) => sum + item.main.temp, 0) / items.length;
      const maxPrecipitation = Math.max(...items.map((item) => item.pop * 100));
      const avgWindSpeed =
        items.reduce((sum, item) => sum + item.wind.speed, 0) / items.length;
      const avgHumidity =
        items.reduce((sum, item) => sum + item.main.humidity, 0) / items.length;

      // Get most common weather condition
      const weatherConditions = items.map((item) => item.weather[0]);
      const mostCommonWeather =
        weatherConditions[Math.floor(weatherConditions.length / 2)];

      const conditions = this.mapWeatherCondition(mostCommonWeather.id);
      const suitable = this.isSuitableForOutdoorWork({
        date: dateKey,
        temperature: avgTemp,
        conditions,
        precipitation: maxPrecipitation,
        windSpeed: avgWindSpeed,
        humidity: avgHumidity,
        description: mostCommonWeather.description,
        suitable: true, // Will be calculated
      });

      forecasts.push({
        date: dateKey,
        temperature: Math.round(avgTemp * 10) / 10,
        conditions,
        precipitation: Math.round(maxPrecipitation),
        windSpeed: Math.round(avgWindSpeed * 10) / 10,
        humidity: Math.round(avgHumidity),
        description: mostCommonWeather.description,
        suitable,
      });

      processedDays++;
    }

    return forecasts;
  }

  /**
   * Map OpenWeatherMap weather condition ID to our condition types
   */
  private static mapWeatherCondition(
    weatherId: number
  ): WeatherForecast['conditions'] {
    // OpenWeatherMap weather condition IDs:
    // 2xx: Thunderstorm
    // 3xx: Drizzle
    // 5xx: Rain
    // 6xx: Snow
    // 7xx: Atmosphere (fog, mist, etc.)
    // 800: Clear
    // 80x: Clouds

    if (weatherId >= 200 && weatherId < 300) return 'storm';
    if (weatherId >= 300 && weatherId < 600) return 'rain';
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    if (weatherId === 800) return 'clear';
    return 'cloudy';
  }

  /**
   * Validate coordinates
   */
  private static isValidCoordinates(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  /**
   * Get cached data if available and not expired
   */
  private static getFromCache(key: string): WeatherForecast[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_DURATION_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Enforce rate limiting between API requests
   */
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
      const delay = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for a specified duration
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get fallback forecast data when API is unavailable
   */
  private static getFallbackForecast(days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      forecasts.push({
        date: date.toISOString().split('T')[0],
        temperature: 15,
        conditions: 'cloudy',
        precipitation: 30,
        windSpeed: 10,
        humidity: 60,
        description: 'Partly cloudy',
        suitable: true,
      });
    }

    logger.warn('Using fallback weather forecast', {
      service: 'WeatherService',
      days,
    });

    return forecasts;
  }

  /**
   * Clear the cache (useful for testing)
   */
  static clearCache(): void {
    this.cache.clear();
    logger.info('Weather cache cleared', {
      service: 'WeatherService',
    });
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  static getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}
