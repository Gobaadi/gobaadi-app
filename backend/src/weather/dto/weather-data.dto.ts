import { ApiProperty } from '@nestjs/swagger';

export class WeatherDataDto {
  @ApiProperty({ example: 'Kathmandu, Nepal' })
  location: string;

  @ApiProperty({ example: 28.5 })
  temperature: number;

  @ApiProperty({ example: 32.1 })
  highTemp: number;

  @ApiProperty({ example: 22.3 })
  lowTemp: number;

  @ApiProperty({ example: 65 })
  humidityPercentage: number;

  @ApiProperty({ example: 12.5 })
  precipitationMl: number;

  @ApiProperty({ example: 1013 })
  pressureHpa: number;

  @ApiProperty({ example: 5.2 })
  windMps: number;

  @ApiProperty({ example: '06:15 AM' })
  sunriseTime: string;

  @ApiProperty({ example: '06:45 PM' })
  sunsetTime: string;

  @ApiProperty({ example: false })
  isCached: boolean;

  @ApiProperty({ example: 0, required: false })
  weatherCode?: number;

  @ApiProperty({ example: 'Clear sky', required: false })
  condition?: string;
}
