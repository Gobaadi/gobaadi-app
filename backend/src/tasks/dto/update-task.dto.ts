import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaskPriority } from '../task.entity';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Feed Animals' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ example: 'Morning feed for cattle', required: false })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ example: '2026-07-27T06:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional({
    example: 'animal',
    enum: ['field', 'animal', 'appointment', 'other'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['field', 'animal', 'appointment', 'other'])
  category?: string;

  @ApiPropertyOptional({ example: 'medium', enum: TaskPriority })
  @IsOptional()
  @IsIn(Object.values(TaskPriority))
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
