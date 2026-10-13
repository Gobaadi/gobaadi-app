import { Injectable, Logger } from '@nestjs/common';
import { IWeatherProvider } from '../weather-provider.interface';
import { WeatherDataDto } from '../dto/weather-data.dto';

const REQUEST_TIMEOUT_MS = 2500;

interface OpenMeteoResponse {
  timezone?: string;
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    surface_pressure?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    precipitation?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
}

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

@Injectable()
export class OpenMeteoProvider implements IWeatherProvider {
  private readonly logger = new Logger(OpenMeteoProvider.name);

  async fetchWeatherData(
    lat: number,
    long: number,
    district?: string,
  ): Promise<WeatherDataDto> {
    // wind_speed_unit=ms is required: open-meteo defaults to km/h while the
    // DTO/card display m/s. timezone=Asia/Dhaka keeps sunrise/sunset and the
    // current snapshot in Bangladesh local time regardless of server TZ.
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${long}` +
      '&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,precipitation' +
      '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min' +
      '&timezone=Asia%2FDhaka&wind_speed_unit=ms';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(
          `Open-Meteo request failed with status ${response.status}`,
        );
      }
      const data = (await response.json()) as OpenMeteoResponse;
      return this.mapResponse(data, district);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapResponse(
    data: OpenMeteoResponse,
    district?: string,
  ): WeatherDataDto {
    const current = data.current ?? {};
    const daily = data.daily ?? {};
    const weatherCode = current.weather_code ?? 0;

    return {
      location: district || this.cityFromTimezone(data.timezone) || '',
      temperature: Math.round(current.temperature_2m ?? 0),
      highTemp: Math.round(daily.temperature_2m_max?.[0] ?? 0),
      lowTemp: Math.round(daily.temperature_2m_min?.[0] ?? 0),
      humidityPercentage: current.relative_humidity_2m ?? 0,
      precipitationMl: current.precipitation ?? 0,
      pressureHpa: Math.round(current.surface_pressure ?? 0),
      windMps: this.round1(current.wind_speed_10m ?? 0),
      weatherCode,
      condition: WMO_CONDITIONS[weatherCode] ?? 'Unknown',
      sunriseTime: this.formatLocalTime(daily.sunrise?.[0]),
      sunsetTime: this.formatLocalTime(daily.sunset?.[0]),
      isCached: false,
    };
  }

  private cityFromTimezone(timezone?: string): string | undefined {
    if (!timezone) return undefined;
    const segment = timezone.split('/').pop();
    return segment ? segment.replace(/_/g, ' ') : undefined;
  }

  /**
   * Formats open-meteo's naive local ISO time ("2026-10-02T05:50" already in
   * Asia/Dhaka) as "05:50 AM" without Date parsing, so the result never
   * depends on the server's timezone.
   */
  private formatLocalTime(isoLocal?: string): string {
    if (!isoLocal) return '';
    const timePart = isoLocal.split('T')[1];
    if (!timePart) return '';
    const [rawHours, minutes = '00'] = timePart.split(':');
    const hours = Number(rawHours);
    if (Number.isNaN(hours)) return '';
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minutes.slice(0, 2)} ${period}`;
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
