import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardAnimalsService } from '../services/dashboard-animals.service';
import { DashboardAdminGuard } from '../guards/dashboard-admin.guard';

@ApiTags('dashboard-animals')
@ApiBearerAuth()
@UseGuards(DashboardAdminGuard)
@Controller('dashboard/animals')
export class DashboardAnimalsController {
  constructor(private readonly animalsService: DashboardAnimalsService) {}

  @Get()
  @ApiOperation({
    summary: 'List animals (paginated, searchable, breed filter)',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    return this.animalsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
      filter,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get animal by id' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.animalsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete animal' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.animalsService.remove(id);
    return { success: true, message: 'Animal deleted successfully' };
  }
}
