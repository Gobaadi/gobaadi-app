import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import { Medicine } from './medicine.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('medicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the veterinary medicine catalog' })
  @ApiQuery({ name: 'q', required: false, description: 'Name or type search' })
  async search(@Query('q') q?: string): Promise<Medicine[]> {
    return this.medicinesService.search(q);
  }
}
