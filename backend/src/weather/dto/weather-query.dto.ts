import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class WeatherQueryDto {
  @ApiPropertyOptional({ example: 23.55 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 90.53 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  long?: number;

  @ApiPropertyOptional({ example: 'Munshiganj' })
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\s'-]+$/u, {
    message: 'district must contain only letters, spaces, hyphens, and apostrophes',
  })
  district?: string;
}
