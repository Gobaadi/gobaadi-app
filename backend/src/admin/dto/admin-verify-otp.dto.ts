import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminVerifyOtpDto {
  @ApiProperty({ example: 'admin@gobadi.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ enum: ['verify', 'reset'], default: 'verify' })
  @IsOptional()
  @IsEnum(['verify', 'reset'] as const)
  purpose?: 'verify' | 'reset';
}
