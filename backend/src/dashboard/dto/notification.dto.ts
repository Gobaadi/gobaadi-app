import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../notifications/notification.entity';
import { UserRole } from '../../users/user.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'New prescription ready' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your prescription is ready to download' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType, default: 'system' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiPropertyOptional({ example: 'Order' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: '101' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Morning' })
  @IsOptional()
  @IsString()
  occurrence?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  time?: string;
}

export class DashboardSendNotificationDto {
  @ApiProperty({ example: 'New prescription ready' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your prescription is ready to download' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType, default: 'system' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  userIds: number[];

  @ApiPropertyOptional({ example: 'Order' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: '101' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class DashboardBroadcastNotificationDto {
  @ApiProperty({ example: 'System maintenance tonight' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Service will be down from 11pm to 1am' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType, default: 'system' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'Morning' })
  @IsOptional()
  @IsString()
  occurrence?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  time?: string;
}
