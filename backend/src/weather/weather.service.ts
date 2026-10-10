import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WeatherDataDto } from './dto/weather-data.dto';
import { WEATHER_PROVIDER } from './weather-provider.interface';
import type { IWeatherProvider } from './weather-provider.interface';
import { MockWeatherProvider } from './providers/mock-weather.provider';
import { CircuitBreaker } from './circuit-breaker';

const CACHE_TTL_SECONDS = 20 * 60;
const GEO_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const REQUEST_TIMEOUT_MS = 2500;
const DEFAULT_LAT = 23.55;
const DEFAULT_LONG = 90.53;

@Injectable()
export class WeatherService {
  private readonly breaker = new CircuitBreaker();

  constructor(
    @Inject(WEATHER_PROVIDER)
    private readonly primaryProvider: IWeatherProvider,
    private readonly fallbackProvider: MockWeatherProvider,
    private readonly redisService: RedisService,
  ) {}

  async getWeather(
    lat?: number,
    long?: number,
    district?: string,
  ): Promise<WeatherDataDto> {
    const isDistrictLookup = lat == null && long == null && !!district;
    let resolvedLat = lat ?? DEFAULT_LAT;
    let resolvedLong = long ?? DEFAULT_LONG;

    if (isDistrictLookup && district) {
      const coords = await this.geocodeDistrict(district);
      resolvedLat = coords.lat;
      resolvedLong = coords.long;
    }

    const cacheKey =
      isDistrictLookup && district
        ? `cache:weather:district:${district.toLowerCase()}`
        : this.buildCacheKey(resolvedLat, resolvedLong);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), isCached: true };
      }
    } catch (err) {
      console.warn('Failed to read weather cache from Redis', err);
    }

    const weather = await this.breaker.execute(
      () =>
        this.primaryProvider.fetchWeatherData(
          resolvedLat,
          resolvedLong,
          district,
        ),
      () =>
        this.fallbackProvider.fetchWeatherData(
          resolvedLat,
          resolvedLong,
          district,
        ),
    );

    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(weather),
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      console.warn('Failed to write weather cache to Redis', err);
    }

    return weather;
  }

  private async geocodeDistrict(
    district: string,
  ): Promise<{ lat: number; long: number }> {
    const geoCacheKey = `cache:weather:geo:${district.toLowerCase()}`;

    try {
      const cached = await this.redisService.get(geoCacheKey);
      if (cached) {
        const coords = JSON.parse(cached);
        if (typeof coords?.lat === 'number' && typeof coords?.long === 'number') {
          return coords;
        }
      }
    } catch (err) {
      console.warn('Failed to read geocode cache from Redis', err);
    }

    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENWEATHER_API_KEY is not configured');
      }
      const url =
        `https://api.openweathermap.org/geo/1.0/direct` +
        `?q=${encodeURIComponent(district)},BD&limit=1&appid=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(
            `OpenWeather geocoding request failed with status ${response.status}`,
          );
        }
        const data = await response.json();
        const match = Array.isArray(data) ? data[0] : undefined;
        if (
          match &&
          typeof match.lat === 'number' &&
          typeof match.lon === 'number'
        ) {
          const coords = { lat: match.lat as number, long: match.lon as number };
          try {
            await this.redisService.set(
              geoCacheKey,
              JSON.stringify(coords),
              GEO_CACHE_TTL_SECONDS,
            );
          } catch (err) {
            console.warn('Failed to write geocode cache to Redis', err);
          }
          return coords;
        }
      } finally {
        clearTimeout(timeout);
      }
      console.warn(
        `Geocoding returned no match for district "${district}", using default coordinates`,
      );
    } catch (err) {
      console.warn(
        `Geocoding failed for district "${district}", using default coordinates`,
        err,
      );
    }

    return { lat: DEFAULT_LAT, long: DEFAULT_LONG };
  }

  private buildCacheKey(lat: number, long: number): string {
    return `cache:weather:lat:${lat.toFixed(2)}:long:${long.toFixed(2)}`;
  }
}
