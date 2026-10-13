import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '../../users/users.service';
import { S3Service } from '../../s3/s3.service';
import { User } from '../../users/user.entity';
import { UpdateDashboardUserDto } from '../dto/update-user.dto';
import { DashboardAdminGuard } from '../guards/dashboard-admin.guard';

const USER_SAFE_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'avatar',
  'role',
  'verified',
  'createdAt',
  'updatedAt',
] as const;

function toPublicUser(
  user: User,
): Pick<User, (typeof USER_SAFE_FIELDS)[number]> {
  const safe = {} as Record<string, unknown>;
  for (const field of USER_SAFE_FIELDS) {
    safe[field] = user[field];
  }
  return safe as Pick<User, (typeof USER_SAFE_FIELDS)[number]>;
}

@ApiTags('dashboard-users')
@ApiBearerAuth()
@UseGuards(DashboardAdminGuard)
@Controller('dashboard/users')
export class DashboardUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await this.usersService.findPaginated(
      pageNum,
      limitNum,
      search,
    );
    return {
      users: result.data.map(toPublicUser),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a user (multipart avatar supported)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDashboardUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file?.buffer) {
      const uploaded = await this.s3Service.uploadFile(file.buffer, {
        folder: 'gobadi/avatars',
        contentType: file.mimetype,
      });
      body.avatar = uploaded.url;
    }
    const updated = await this.usersService.adminUpdate(id, body);
    return toPublicUser(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
    return { success: true, message: 'User deleted successfully' };
  }
}
