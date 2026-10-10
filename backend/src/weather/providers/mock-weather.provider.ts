import { Injectable } from '@nestjs/common';
import { IWeatherProvider } from '../weather-provider.interface';
import { WeatherDataDto } from '../dto/weather-data.dto';

@Injectable()
export class MockWeatherProvider implements IWeatherProvider {
  async fetchWeatherData(
    lat: number,
    long: number,
    district?: string,
  ): Promise<WeatherDataDto> {
    return {
      location: district || '',
      temperature: 35,
      highTemp: 35,
      lowTemp: 15,
      humidityPercentage: 40,
      precipitationMl: 5.1,
      pressureHpa: 450,
      windMps: 23,
      sunriseTime: '05:25 AM',
      sunsetTime: '06:53 PM',
      isCached: false,
    };
  }
}
