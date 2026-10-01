import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConsultationType } from '../appointment.entity';

export class BookSlotDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  clinicId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  serviceId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'The animal being treated — must be owned by the booking user',
  })
  @IsOptional()
  @IsNumber()
  animalId?: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '10:30 AM' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiPropertyOptional({
    enum: ConsultationType,
    example: ConsultationType.PHYSICAL,
  })
  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType;

  @ApiProperty({ example: 'High fever for 3 days' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reasonForConsultation: string;

  @ApiPropertyOptional({ example: ['Fever', 'weakness', 'reduced appetite'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];
}
