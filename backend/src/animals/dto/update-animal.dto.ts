import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateAnimalDto {
  @ApiPropertyOptional({ example: 'Bella' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Holstein' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ example: '450kg' })
  @IsOptional()
  @IsString()
  weight?: string;

  @ApiPropertyOptional({ example: '3 years' })
  @IsOptional()
  @IsString()
  age?: string;

  @ApiPropertyOptional({ example: 'Brown & White' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'https://example.com/animal.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 'A gentle cow' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '15/03/2023' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Female' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'Farm born' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: '10/01/2024' })
  @IsOptional()
  @IsString()
  joinedFarm?: string;

  @ApiPropertyOptional({ example: '420kg' })
  @IsOptional()
  @IsString()
  liveWeight?: string;

  @ApiPropertyOptional({ example: 'Pregnant' })
  @IsOptional()
  @IsString()
  reproStatus?: string;

  @ApiPropertyOptional({ example: ['https://example.com/photo1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ example: '50000' })
  @IsOptional()
  @IsString()
  photoCost?: string;

  @ApiPropertyOptional({ example: '80000' })
  @IsOptional()
  @IsString()
  sellingPrice?: string;

  @ApiPropertyOptional({ example: '200' })
  @IsOptional()
  @IsString()
  liveWeightPrice?: string;
}
