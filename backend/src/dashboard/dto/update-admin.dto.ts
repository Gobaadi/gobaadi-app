import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from '../../admin/entities/admin.entity';

const ADMIN_DESIGNATION_VALUES = Object.values(AdminDesignation);

export class UpdateDashboardAdminDto {
  @ApiPropertyOptional({ example: 'Admin User' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'admin@gobadi.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'admin123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({
    enum: [...ADMIN_DESIGNATION_VALUES, 'co-founder'],
    description: 'Accepts both "co_founder" and legacy "co-founder".',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'co-founder' ? 'co_founder' : value,
  )
  @IsIn([...ADMIN_DESIGNATION_VALUES, 'co-founder'])
  designation?: AdminDesignation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ enum: AdminStatus })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
