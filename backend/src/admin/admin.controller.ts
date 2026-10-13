import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  Admin,
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from './entities/admin.entity';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { PaginatedResult } from '../common/paginated-result.interface';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateAdminDto {
  @ApiPropertyOptional({ example: 'Admin User' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ example: 'admin@gobadi.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.ADMIN })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiProperty({ enum: AdminDesignation })
  @IsEnum(AdminDesignation)
  designation: AdminDesignation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ enum: AdminStatus, default: AdminStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}

class UpdateAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({ enum: AdminDesignation })
  @IsOptional()
  @IsEnum(AdminDesignation)
  designation?: AdminDesignation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ enum: AdminStatus })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}

@ApiTags('admins')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all admins' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<Admin>> {
    return this.adminService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin' })
  async create(@Body() body: CreateAdminDto): Promise<Admin> {
    return this.adminService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  async findById(@Param('id') id: string): Promise<Admin> {
    return this.adminService.findById(parseInt(id, 10));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admin' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateAdminDto,
  ): Promise<Admin> {
    return this.adminService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admin' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.adminService.delete(parseInt(id, 10));
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Toggle admin active/deactive status' })
  async deactivate(@Param('id') id: string): Promise<Admin> {
    return this.adminService.deactivate(parseInt(id, 10));
  }
}
