import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminDesignation } from '../entities/admin.entity';

const ADMIN_DESIGNATION_VALUES = Object.values(AdminDesignation);

export class AdminUpdateProfileDto {
  @ApiPropertyOptional({ example: 'Admin User' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    enum: [...ADMIN_DESIGNATION_VALUES, 'co-founder'],
    description:
      'Admin designation. Accepts both "co_founder" and legacy "co-founder".',
  })
  @IsOptional()
  @Transform(({ value }) => (value === 'co-founder' ? 'co_founder' : value))
  @IsIn([...ADMIN_DESIGNATION_VALUES, 'co-founder'])
  designation?: AdminDesignation;

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ example: '+8801XXXXXXXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
