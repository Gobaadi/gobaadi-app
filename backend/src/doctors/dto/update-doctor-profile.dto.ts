import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CredentialPeriodDto {
  @ApiPropertyOptional({ example: 'August' })
  @IsString()
  @IsOptional()
  startMonth?: string;

  @ApiPropertyOptional({ example: '2024' })
  @IsString()
  @IsOptional()
  startYear?: string;

  @ApiPropertyOptional({ example: 'January' })
  @IsString()
  @IsOptional()
  endMonth?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsString()
  @IsOptional()
  endYear?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isCurrentlyStudying?: boolean;
}

export class UpdateDoctorProfileDto {
  @ApiPropertyOptional({ example: 'Dr. John Smith' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: '10 Years' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Experienced cardiologist...' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  consultationFee?: number;

  @ApiPropertyOptional({ example: 'VET-12345' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description:
      "Academic credential period shown on the doctor's profile (start/end month-year and current-study flag)",
    type: CredentialPeriodDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialPeriodDto)
  credentialPeriod?: CredentialPeriodDto;
}
