import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MedicineDto {
  @ApiProperty({ example: 'Amoxicillin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '500mg twice daily' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: '2 tablets' })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({ example: 'Twice daily' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ example: '7 days' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ example: 'Take with food' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: 'Avoid dairy products' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  appointmentId: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Animal being prescribed for. Optional — falls back to the appointment animal, then the owner’s single animal.',
  })
  @IsOptional()
  @IsNumber()
  animalId?: number;

  @ApiProperty({ type: [MedicineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines: MedicineDto[];
}
