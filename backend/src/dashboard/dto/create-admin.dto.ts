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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from '../../admin/entities/admin.entity';

const ADMIN_DESIGNATION_VALUES = Object.values(AdminDesignation);

export class CreateDashboardAdminDto {
  @ApiProperty({ example: 'Admin User' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'admin@gobadi.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.ADMIN })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiProperty({
    enum: [...ADMIN_DESIGNATION_VALUES, 'co-founder'],
    description: 'Accepts both "co_founder" and legacy "co-founder".',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === 'co-founder' ? 'co_founder' : value,
  )
  @IsIn([...ADMIN_DESIGNATION_VALUES, 'co-founder'])
  designation: AdminDesignation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ enum: AdminStatus, default: AdminStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
