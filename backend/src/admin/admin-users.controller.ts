import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
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
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginatedResult } from '../common/paginated-result.interface';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AdminUpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.findPaginated(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Update a user's role (admin only)" })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateRole(parseInt(id, 10), body.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Full update a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id') id: string,
    @Body() body: AdminUpdateUserDto,
  ): Promise<User> {
    return this.usersService.adminUpdate(parseInt(id, 10), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.usersService.remove(parseInt(id, 10));
  }
}
