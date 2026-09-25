import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from '../../admin/admin.service';
import { CreateDashboardAdminDto } from '../dto/create-admin.dto';
import { UpdateDashboardAdminDto } from '../dto/update-admin.dto';
import { DashboardSuperAdminGuard } from '../guards/dashboard-super-admin.guard';

@ApiTags('dashboard-admins')
@ApiBearerAuth()
@UseGuards(DashboardSuperAdminGuard)
@Controller('dashboard/admins')
export class DashboardAdminsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List admins (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an admin by id' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an admin' })
  async create(@Body() body: CreateDashboardAdminDto) {
    return this.adminService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an admin' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDashboardAdminDto,
  ) {
    return this.adminService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an admin' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.delete(id);
    return { success: true, message: 'Admin deleted successfully' };
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Toggle admin active/deactive status' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deactivate(id);
  }
}
