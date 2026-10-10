import { Injectable, Logger } from '@nestjs/common';
import { IWeatherProvider } from '../weather-provider.interface';
import { WeatherDataDto } from '../dto/weather-data.dto';

const REQUEST_TIMEOUT_MS = 2500;

@Injectable()
export class OpenWeatherProvider implements IWeatherProvider {
  private readonly logger = new Logger(OpenWeatherProvider.name);

  async fetchWeatherData(
    lat: number,
    long: number,
    district?: string,
  ): Promise<WeatherDataDto> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=${apiKey}&units=metric`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(
          `OpenWeather request failed with status ${response.status}`,
        );
      }
      const data = await response.json();
      return this.mapResponse(data, district);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapResponse(data: any, district?: string): WeatherDataDto {
    const timezoneOffsetSeconds: number = data.timezone ?? 0;
    return {
      location: district || '',
      temperature: Math.round(data.main?.temp),
      highTemp: Math.round(data.main?.temp_max),
      lowTemp: Math.round(data.main?.temp_min),
      humidityPercentage: data.main?.humidity,
      precipitationMl: (data.rain?.['1h'] ?? data.snow?.['1h'] ?? 0) as number,
      pressureHpa: data.main?.pressure,
      windMps: data.wind?.speed,
      sunriseTime: this.formatTime(data.sys?.sunrise, timezoneOffsetSeconds),
      sunsetTime: this.formatTime(data.sys?.sunset, timezoneOffsetSeconds),
      isCached: false,
    };
  }

  private formatTime(
    unixSeconds: number,
    timezoneOffsetSeconds: number,
  ): string {
    if (!unixSeconds) {
      return '';
    }
    const localMs = (unixSeconds + timezoneOffsetSeconds) * 1000;
    const date = new Date(localMs);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}
